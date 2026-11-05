"""Creates compact fact files for the dashboard slicers.

Outputs (dashboard/src/data/):
- fact_time_city_cuisine.json : (year, month, city, cuisine) -> revenue, orders
- fact_customer_dims.json     : (year, city, cuisine, dim, value) -> revenue, orders
- fact_users.json             : unique buying users by city/cuisine (all-time and per year)
- fact_dow.json               : (year, city, cuisine, weekday) -> revenue, orders
- fact_rest.json              : per-restaurant revenue/orders with year split (top 40 per city)
- fact_rating.json            : rating-band counts + market aggregates (city, cuisine incl. totals)
- fact_menu.json              : menu catalogue aggregates + top items (city, cuisine incl. totals)

Aggregate rows use "*" for the "all values" key so the UI can always serve a total.
"""
import json
import os

import numpy as np
import pandas as pd

CLEAN = os.path.join("data", "cleaned")
DST = os.path.join("dashboard", "src", "data")
os.makedirs(DST, exist_ok=True)

orders = pd.read_csv(os.path.join(CLEAN, "Orders.csv"))
rest = pd.read_csv(os.path.join(CLEAN, "Restaurant.csv"))
users = pd.read_csv(os.path.join(CLEAN, "Users.csv"))
menu = pd.read_csv(os.path.join(CLEAN, "Menu.csv"))
food = pd.read_csv(os.path.join(CLEAN, "Food.csv"))

rest_lite = rest[["restaurant_id", "city", "cuisine_main", "rating_num", "name"]]
fact = orders.merge(rest_lite, on="restaurant_id", how="left")
fact["city"] = fact["city"].fillna("Unassigned")
fact["cuisine_main"] = fact["cuisine_main"].fillna("Other")
fact["name"] = fact["name"].fillna("Unassigned")
fact["rating_num"] = fact["rating_num"].fillna(0)

cities = sorted(fact["city"].unique())
cuisines = sorted(fact["cuisine_main"].unique())

# ---------------------------------------------------------------- sales / time
tcc = (
    fact.groupby(["year", "month", "year_month", "city", "cuisine_main"])
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)
tccj = [
    {
        "y": int(r["year"]),
        "m": int(r["month"]),
        "ym": r["year_month"],
        "c": r["city"],
        "cu": r["cuisine_main"],
        "r": int(r["revenue"]),
        "o": int(r["orders"]),
    }
    for r in tcc.to_dict(orient="records")
]

# ---------------------------------------------------------------- weekday
dow = (
    fact.groupby(["year", "city", "cuisine_main", "day_name"])
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)
dowj = [
    {
        "y": int(r["year"]),
        "c": r["city"],
        "cu": r["cuisine_main"],
        "d": r["day_name"],
        "r": int(r["revenue"]),
        "o": int(r["orders"]),
    }
    for r in dow.to_dict(orient="records")
]

# ---------------------------------------------------------------- customer dims
udim = fact.merge(
    users[["user_id", "gender", "age_group", "loyalty_status", "occupation"]],
    on="user_id",
    how="left",
)
for col in ["gender", "age_group", "loyalty_status", "occupation"]:
    udim[col] = udim[col].fillna("Unknown")

dim_frames = []
for key, col in [("g", "gender"), ("a", "age_group"), ("l", "loyalty_status"), ("oc", "occupation")]:
    g = (
        udim.groupby(["year", "city", "cuisine_main", col])
        .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
        .reset_index()
    )
    for r in g.to_dict(orient="records"):
        dim_frames.append(
            {
                "y": int(r["year"]),
                "c": r["city"],
                "cu": r["cuisine_main"],
                "k": key,
                "v": r[col],
                "r": int(r["revenue"]),
                "o": int(r["orders"]),
            }
        )

# ---------------------------------------------------------------- unique users
all_time = udim.groupby(["city", "cuisine_main"])["user_id"].nunique().reset_index(name="u")
by_year = udim.groupby(["year", "city", "cuisine_main"])["user_id"].nunique().reset_index(name="u")

users_all = [
    {"c": r["city"], "cu": r["cuisine_main"], "u": int(r["u"])} for r in all_time.to_dict(orient="records")
]
users_year = [
    {"y": int(r["year"]), "c": r["city"], "cu": r["cuisine_main"], "u": int(r["u"])}
    for r in by_year.to_dict(orient="records")
]
# totals across cuisines and cities
for (c,), grp in all_time.groupby(["city"]):
    users_all.append({"c": c, "cu": "*", "u": int(grp["u"].sum())})
for (cu,), grp in all_time.groupby(["cuisine_main"]):
    users_all.append({"c": "*", "cu": cu, "u": int(grp["u"].sum())})
users_all.append({"c": "*", "cu": "*", "u": int(all_time["u"].sum())})

for (y, c), grp in by_year.groupby(["year", "city"]):
    users_year.append({"y": int(y), "c": c, "cu": "*", "u": int(grp["u"].sum())})
for (y, cu), grp in by_year.groupby(["year", "cuisine_main"]):
    users_year.append({"y": int(y), "c": "*", "cu": cu, "u": int(grp["u"].sum())})
for (y,), grp in by_year.groupby(["year"]):
    users_year.append({"y": int(y), "c": "*", "cu": "*", "u": int(grp["u"].sum())})

# ---------------------------------------------------------------- restaurants
fr = (
    fact[fact["name"] != "Unassigned"]
    .groupby(["year", "restaurant_id", "name", "city", "cuisine_main", "rating_num"], as_index=False)
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
)
# keep the 12 revenue leaders for every (year, city, cuisine) slice so that any
# slicer combination still has leaderboards to show
fr["rk"] = fr.groupby(["year", "city", "cuisine_main"])["revenue"].rank(method="first", ascending=False)
fr = fr[fr["rk"] <= 12].drop(columns="rk").sort_values("revenue", ascending=False)
frj = [
    {
        "y": int(r["year"]),
        "n": r["name"],
        "c": r["city"],
        "cu": r["cuisine_main"],
        "rt": float(r["rating_num"]),
        "r": int(r["revenue"]),
        "o": int(r["orders"]),
    }
    for r in fr.to_dict(orient="records")
]

# ---------------------------------------------------------------- ratings
rest["city"] = rest["city"].fillna("Unassigned")
rest["cuisine_main"] = rest["cuisine_main"].fillna("Other")
rest["rating_band"] = rest["rating_band"].fillna("Not Rated")
rest["rating_num"] = rest["rating_num"].fillna(0)
rest["rating_count_num"] = rest["rating_count_num"].fillna(0)

bands = (
    rest.groupby(["city", "cuisine_main", "rating_band"], as_index=False)
    .agg(n=("restaurant_id", "count"))
)
evaluated = rest[rest["rating_num"] > 0]
markets = (
    evaluated.groupby(["city", "cuisine_main"], as_index=False)
    .agg(restaurants=("restaurant_id", "count"), avg_rating=("rating_num", "mean"), rating_mins=("rating_count_num", "sum"))
)
# include markets with only unrated outlets so counts stay honest
all_counts = rest.groupby(["city", "cuisine_main"], as_index=False).agg(total=("restaurant_id", "count"))
markets = all_counts.merge(markets, on=["city", "cuisine_main"], how="left")
markets["restaurants"] = markets["total"]
markets["avg_rating"] = markets["avg_rating"].fillna(0)
markets["rating_mins"] = markets["rating_mins"].fillna(0)

band_all = []
for r in bands.to_dict(orient="records"):
    band_all.append({"c": r["city"], "cu": r["cuisine_main"], "band": r["rating_band"], "n": int(r["n"])})
for (c, band), grp in bands.groupby(["city", "rating_band"]):
    band_all.append({"c": c, "cu": "*", "band": band, "n": int(grp["n"].sum())})
for (cu, band), grp in bands.groupby(["cuisine_main", "rating_band"]):
    band_all.append({"c": "*", "cu": cu, "band": band, "n": int(grp["n"].sum())})
for (band,), grp in bands.groupby(["rating_band"]):
    band_all.append({"c": "*", "cu": "*", "band": band, "n": int(grp["n"].sum())})

market_all = []
for r in markets.to_dict(orient="records"):
    market_all.append(
        {
            "c": r["city"],
            "cu": r["cuisine_main"],
            "restaurants": int(r["restaurants"]),
            "avg_rating": round(float(r["avg_rating"]), 4),
            "rating_mins": int(r["rating_mins"]),
        }
    )
for (c,), grp in markets.groupby(["city"]):
    w = grp["restaurants"].sum()
    market_all.append(
        {
            "c": c,
            "cu": "*",
            "restaurants": int(w),
            "avg_rating": round(float((grp["avg_rating"] * grp["restaurants"]).sum() / max(w, 1)), 4),
            "rating_mins": int(grp["rating_mins"].sum()),
        }
    )
for (cu,), grp in markets.groupby(["cuisine_main"]):
    w = grp["restaurants"].sum()
    market_all.append(
        {
            "c": "*",
            "cu": cu,
            "restaurants": int(w),
            "avg_rating": round(float((grp["avg_rating"] * grp["restaurants"]).sum() / max(w, 1)), 4),
            "rating_mins": int(grp["rating_mins"].sum()),
        }
    )
w = markets["restaurants"].sum()
market_all.append(
    {
        "c": "*",
        "cu": "*",
        "restaurants": int(w),
        "avg_rating": round(float((markets["avg_rating"] * markets["restaurants"]).sum() / max(w, 1)), 4),
        "rating_mins": int(markets["rating_mins"].sum()),
    }
)

# ---------------------------------------------------------------- menu catalogue
mrest = rest[["restaurant_id", "city", "cuisine_main"]]
m = menu.merge(mrest, on="restaurant_id", how="left").merge(
    food[["food_id", "item", "food_type"]], on="food_id", how="left"
)
m["city"] = m["city"].fillna("Unassigned")
m["cuisine_main"] = m["cuisine_main"].fillna("Other")
m["food_type"] = m["food_type"].fillna("Veg")
m["item"] = m["item"].fillna("Unknown")
m["price"] = m["price"].fillna(0)
m["price_band"] = m["price_band"].fillna("Budget (<100)")

menu_rows = []
band_rows = []
item_rows = []


def menu_agg(frame, c_key, cu_key):
    g = frame.groupby(["city", "cuisine_main"], as_index=False).agg(
        lines=("menu_key", "count"),
        veg=("food_type", lambda s: int((s == "Veg").sum())),
        nonveg=("food_type", lambda s: int((s == "Non-Veg").sum())),
        median=("price", "median"),
    )
    for r in g.to_dict(orient="records"):
        menu_rows.append(
            {
                "c": c_key(r["city"]),
                "cu": cu_key(r["cuisine_main"]),
                "lines": int(r["lines"]),
                "veg": int(r["veg"]),
                "nonveg": int(r["nonveg"]),
                "median": int(round(r["median"])),
            }
        )
    b = frame.groupby(["city", "cuisine_main", "price_band"], as_index=False).agg(n=("menu_key", "count"))
    for r in b.to_dict(orient="records"):
        band_rows.append({"c": c_key(r["city"]), "cu": cu_key(r["cuisine_main"]), "band": r["price_band"], "n": int(r["n"])})
    it = (
        frame.groupby(["city", "cuisine_main", "item"], as_index=False)
        .agg(n=("menu_key", "count"), price=("price", "mean"))
        .sort_values("n", ascending=False)
        .groupby(["city", "cuisine_main"])
        .head(10)
    )
    for r in it.to_dict(orient="records"):
        item_rows.append(
            {"c": c_key(r["city"]), "cu": cu_key(r["cuisine_main"]), "item": r["item"], "n": int(r["n"]), "price": int(round(r["price"]))}
        )


menu_agg(m, lambda c: c, lambda cu: cu)
menu_agg(m.assign(city="*"), lambda c: c, lambda cu: cu)
menu_agg(m.assign(cuisine_main="*"), lambda c: c, lambda cu: cu)
menu_agg(m.assign(city="*", cuisine_main="*"), lambda c: c, lambda cu: cu)

# ---------------------------------------------------------------- write files
def dump(name, obj):
    path = os.path.join(DST, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"))
    print(name, os.path.getsize(path) // 1024, "KB")


dump("fact_time_city_cuisine.json", {"rows": tccj, "cities": cities, "cuisines": cuisines})
dump("fact_dow.json", dowj)
dump("fact_customer_dims.json", dim_frames)
dump("fact_users.json", {"all": users_all, "year": users_year})
dump("fact_rest.json", frj)
dump("fact_rating.json", {"bands": band_all, "markets": market_all})
dump("fact_menu.json", {"rows": menu_rows, "bands": band_rows, "items": item_rows, "cities": cities, "cuisines": cuisines})

for name in ["fact_time_city_cuisine.json", "fact_dow.json", "fact_customer_dims.json", "fact_users.json",
             "fact_rest.json", "fact_rating.json", "fact_menu.json"]:
    print(name, "OK")
