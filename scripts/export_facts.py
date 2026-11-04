"""Creates compact fact files for the dashboard slicers.

Outputs:
- dashboard/src/data/fact_time_city_cuisine.json  (year, month, city, cuisine -> rev, orders)
- dashboard/src/data/fact_time_userdim.json       (year, month, city, gender, age_group, loyalty, occupation -> rev, orders)
- dashboard/src/data/fact_rest.json               (restaurant -> rev, orders)
- dashboard/src/data/fact_daily.json              (date -> rev, orders) for the realtime ticker
"""
import json
import os

import pandas as pd

CLEAN = os.path.join("data", "cleaned")
DST = os.path.join("dashboard", "src", "data")
os.makedirs(DST, exist_ok=True)

orders = pd.read_csv(os.path.join(CLEAN, "Orders.csv"))
rest = pd.read_csv(os.path.join(CLEAN, "Restaurant.csv"))

rest_lite = rest[["restaurant_id", "city", "cuisine_main", "rating_num", "name"]]
fact = orders.merge(rest_lite, on="restaurant_id", how="left")
fact["city"] = fact["city"].fillna("Unassigned")
fact["cuisine_main"] = fact["cuisine_main"].fillna("Other")
fact["name"] = fact["name"].fillna("Unassigned")
fact["rating_num"] = fact["rating_num"].fillna(0)

# --- time x city x cuisine
tcc = (
    fact.groupby(["year", "month", "year_month", "city", "cuisine_main"])
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)

# --- time x user dims x city
udim = fact.merge(
    pd.read_csv(os.path.join(CLEAN, "Users.csv"))[
        ["user_id", "gender", "age_group", "loyalty_status", "occupation"]
    ],
    left_on="user_id",
    right_on="user_id",
    how="left",
)
udim["gender"] = udim["gender"].fillna("Unknown")
udim["age_group"] = udim["age_group"].fillna("Unknown")
udim["loyalty_status"] = udim["loyalty_status"].fillna("Unknown")
udim["occupation"] = udim["occupation"].fillna("Unknown")

tud = (
    udim.groupby(
        ["year", "month", "year_month", "city", "gender", "age_group", "loyalty_status", "occupation"]
    )
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)

# --- per restaurant
fr = (
    fact.groupby(["name", "city", "cuisine_main", "rating_num"], as_index=False)
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
)
fr = fr[fr["name"] != "Unassigned"].sort_values("revenue", ascending=False)

# --- daily for realtime ticker
fd = (
    fact.groupby("order_date", as_index=False)
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
)

def slim_tcc(row):
    return {
        "y": int(row["year"]),
        "m": int(row["month"]),
        "ym": row["year_month"],
        "c": row["city"],
        "cu": row["cuisine_main"],
        "r": int(row["revenue"]),
        "o": int(row["orders"]),
    }

def slim_tud(row):
    return {
        "y": int(row["year"]),
        "m": int(row["month"]),
        "ym": row["year_month"],
        "c": row["city"],
        "g": row["gender"],
        "a": row["age_group"],
        "l": row["loyalty_status"],
        "oc": row["occupation"],
        "r": int(row["revenue"]),
        "o": int(row["orders"]),
    }

tccj = [slim_tcc(r) for r in tcc.to_dict(orient="records")]
tudj = [slim_tud(r) for r in tud.to_dict(orient="records")]
frj = [
    {
        "n": r["name"],
        "c": r["city"],
        "cu": r["cuisine_main"],
        "rt": float(r["rating_num"]),
        "r": int(r["revenue"]),
        "o": int(r["orders"]),
    }
    for r in fr.head(500).to_dict(orient="records")
]
fdj = {r["order_date"]: {"r": int(r["revenue"]), "o": int(r["orders"])} for r in fd.to_dict(orient="records")}

# mapping tables so the UI can show full names
cities = sorted(fact["city"].unique())
cuisines = sorted(fact["cuisine_main"].unique())
occupations = sorted(udim["occupation"].unique())
loyalties = sorted(udim["loyalty_status"].unique())

with open(os.path.join(DST, "fact_time_city_cuisine.json"), "w") as f:
    json.dump({"rows": tccj, "cities": cities, "cuisines": cuisines}, f)
with open(os.path.join(DST, "fact_time_userdim.json"), "w") as f:
    json.dump({"rows": tudj, "cities": cities, "occupations": occupations, "loyalties": loyalties}, f)
with open(os.path.join(DST, "fact_rest.json"), "w") as f:
    json.dump(frj, f)
with open(os.path.join(DST, "fact_daily.json"), "w") as f:
    json.dump(fdj, f)

for name, obj in [
    ("fact_time_city_cuisine.json", tccj),
    ("fact_time_userdim.json", tudj),
    ("fact_rest.json", frj),
    ("fact_daily.json", fdj),
]:
    p = os.path.join(DST, name)
    print(name, len(obj), "rows,", os.path.getsize(p) // 1024, "KB")
