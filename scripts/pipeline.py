"""Swiggy dashboard data pipeline.

Cleans the 5 raw tables, builds a star schema, saves cleaned CSVs,
the modeling workbook (.xlsx) and the aggregated JSON consumed by the web dashboard.
"""
import json
import os

import numpy as np
import pandas as pd

RAW = os.path.join("data", "raw")
CLEAN = os.path.join("data", "cleaned")
os.makedirs(CLEAN, exist_ok=True)

# ---------------------------------------------------------------- load
food = pd.read_csv(os.path.join(RAW, "Food.csv"))
menu = pd.read_csv(os.path.join(RAW, "Menu.csv"))
orders = pd.read_csv(os.path.join(RAW, "Orders.csv"))
rest = pd.read_csv(os.path.join(RAW, "Restaurant.csv"))
users = pd.read_csv(os.path.join(RAW, "Users.csv"))

# ---------------------------------------------------------------- 1. standardize headers
def snake(df):
    df.columns = (
        df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace("-", "_")
    )
    return df

food, menu, orders, rest, users = map(snake, (food, menu, orders, rest, users))

# ---------------------------------------------------------------- 2. food
food = food.drop_duplicates(subset="item").reset_index(drop=True)
food["item"] = food["item"].str.strip()
food["food_type"] = food["food_type"].str.title()

# ---------------------------------------------------------------- 3. restaurant
# 3a. split "locality,city" into locality + metro city
parts = rest["city"].str.split(",", n=1, expand=True)
rest["locality"] = parts[0].str.strip()
rest["city_clean"] = parts[1].str.strip() if parts.shape[1] > 1 else rest["city"]
rest["city_clean"] = rest["city_clean"].str.title().str.strip()

# 3b. rating: "--" -> null, numeric
rest["rating_num"] = pd.to_numeric(rest["rating"], errors="coerce")

# 3c. rating_count text bucket -> numeric minimum count
bucket_map = {
    "too few ratings": 0,
    "20+ ratings": 20,
    "50+ ratings": 50,
    "100+ ratings": 100,
    "500+ ratings": 500,
    "1k+ ratings": 1000,
    "5k+ ratings": 5000,
    "10k+ ratings": 10000,
}
rest["rating_count_num"] = (
    rest["rating_count"].str.lower().map(bucket_map).fillna(0).astype(int)
)

# 3d. rating bucket for the dashboard
rest["rating_band"] = pd.cut(
    rest["rating_num"],
    bins=[0, 2, 3, 3.5, 4, 5.01],
    labels=["<2.0", "2.0-3.0", "3.0-3.5", "3.5-4.0", "4.0-5.0"],
    right=False,
).astype(str).replace("nan", "Not Rated")

# 3e. trim text
for c in ["name", "country", "cuisine", "locality"]:
    rest[c] = rest[c].astype(str).str.strip()
rest["cuisine_main"] = rest["cuisine"].str.split(",", n=1, expand=True)[0]
rest["cuisine_main"] = rest["cuisine_main"].str.title()

rest = rest.drop(columns=["rating", "rating_count", "city"]).rename(
    columns={"city_clean": "city"}
)

# ---------------------------------------------------------------- 4. users
users["name"] = users["name"].str.title()
users["gender"] = users["gender"].str.strip()
users["occupation"] = users["occupation"].str.title().str.replace(
    "Self Employeed", "Self Employeed"
)  # keep original value but title-cased
users["occupation"] = users["occupation"].replace({"House Wife": "House Wife"})
users["age_group"] = pd.cut(
    users["age"], bins=[17, 21, 25, 29, 34], labels=["18-21", "22-25", "26-29", "30-33"]
).astype(str)
users["loyalty_status"] = users["marital_status"].str.title()
users = users.drop(columns=["marital_status"])

# ---------------------------------------------------------------- 5. orders
orders["order_date"] = pd.to_datetime(orders["order_date"], errors="coerce")
orders = orders[orders["order_date"].notna()].copy()

# 5a. invalid revenue: amount <= 0 -> null (excluded from revenue measures)
orders["sales_amount_clean"] = orders["sales_amount"].where(
    orders["sales_amount"] > 0
).astype("Float64")

# 5b. sales_amount mostly duplicated across qty rows; unit price fix:
#     invalid QTY 0 -> 1
orders["sales_qty_clean"] = orders["sales_qty"].clip(lower=1).astype("Int64")

# 5c. restaurant_id missing -> 0 (Unassigned)
valid_rest = set(rest["restaurant_id"])
orders["restaurant_id_clean"] = orders["restaurant_id"].where(
    orders["restaurant_id"].notna() & orders["restaurant_id"].isin(valid_rest)
).fillna(0).astype("Int64")

# 5d. drop unusable base columns, keep cleaned
orders["currency"] = "INR"
orders = orders.drop(columns=["sales_amount", "sales_qty", "restaurant_id"]).rename(
    columns={"restaurant_id_clean": "restaurant_id", "sales_amount_clean": "sales_amount", "sales_qty_clean": "sales_qty"}
)

# 5e. date dimension columns for the dashboard
orders["year"] = orders["order_date"].dt.year
orders["month"] = orders["order_date"].dt.month
orders["month_name"] = orders["order_date"].dt.strftime("%b")
orders["year_month"] = orders["order_date"].dt.strftime("%Y-%m")
orders["quarter"] = orders["order_date"].dt.quarter.map(lambda q: f"Q{q}")
orders["day_name"] = orders["order_date"].dt.day_name()
orders["date_key"] = orders["order_date"].dt.strftime("%Y%m%d").astype(int)

# ---------------------------------------------------------------- 6. menu
# 6a. menu_id duplicated across restaurants -> composite key
menu["menu_key"] = menu["restaurant_id"].astype(str) + "_" + menu["food_id"].str.replace("fd", "", regex=False)
before = len(menu)
menu = menu.drop_duplicates(subset="menu_key").reset_index(drop=True)
menu_deduped = before - len(menu)

# 6b. invalid prices -> nan, then impute with cuisine median
menu.loc[menu["price"] <= 0, "price"] = np.nan
menu["price"] = menu["price"].fillna(menu.groupby("cuisine")["price"].transform("median"))
menu["price"] = menu["price"].fillna(menu["price"].median())

# 6c. price bands
menu["price_band"] = pd.cut(
    menu["price"],
    bins=[0, 100, 200, 300, 500, 10000],
    labels=["Budget (<100)", "Value (100-200)", "Mid (200-300)", "Premium (300-500)", "Luxury (500+)"],
)

# 6d. drop orphan food ids
valid_food = set(food["food_id"])
menu = menu[menu["food_id"].isin(valid_food)].reset_index(drop=True)

# ---------------------------------------------------------------- 7. save cleaned csvs
food.to_csv(os.path.join(CLEAN, "Food.csv"), index=False)
menu.to_csv(os.path.join(CLEAN, "Menu.csv"), index=False)
orders.to_csv(os.path.join(CLEAN, "Orders.csv"), index=False)
rest.to_csv(os.path.join(CLEAN, "Restaurant.csv"), index=False)
users.to_csv(os.path.join(CLEAN, "Users.csv"), index=False)

# ---------------------------------------------------------------- 8. xlsx workbook (PBI source)
xlsx_path = os.path.join(CLEAN, "Swiggy_Dashboard_Model.xlsx")
with pd.ExcelWriter(xlsx_path, engine="openpyxl") as xl:
    orders.to_excel(xl, sheet_name="FactOrders", index=False)
    users.to_excel(xl, sheet_name="DimUsers", index=False)
    rest.to_excel(xl, sheet_name="DimRestaurant", index=False)
    menu.head(200000).to_excel(xl, sheet_name="FactMenu", index=False)
    food.to_excel(xl, sheet_name="DimFood", index=False)
print("saved", xlsx_path)

# ---------------------------------------------------------------- 9. aggregate JSON for the web dashboard
rev_per_order = orders.groupby("order_date")["sales_amount"].sum()

monthly = (
    orders.groupby("year_month")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)
monthly["avg_order_value"] = monthly["revenue"] / monthly["orders"]

by_year = (
    orders.groupby("year")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)

by_city = (
    orders.merge(rest[["restaurant_id", "city"]], on="restaurant_id", how="left")
    .groupby("city")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
    .sort_values("revenue", ascending=False)
)
by_city["city"] = by_city["city"].fillna("Unknown")

by_cuisine = (
    orders.merge(rest[["restaurant_id", "cuisine_main"]], on="restaurant_id", how="left")
    .groupby("cuisine_main")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
    .sort_values("revenue", ascending=False)
    .head(15)
)

by_restaurant = (
    orders.merge(
        rest[["restaurant_id", "name", "city", "rating_num"]],
        on="restaurant_id",
        how="left",
    )
    .groupby(["restaurant_id", "name", "city", "rating_num"])
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
    .sort_values("revenue", ascending=False)
    .head(250)
)

by_user_demo = (
    orders.merge(users[["user_id", "age_group", "gender", "loyalty_status", "occupation"]], left_on="user_id", right_on="user_id", how="left")
)

age_split = (
    by_user_demo.groupby("age_group")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)
gender_split = (
    by_user_demo.groupby("gender")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)
loyalty_split = (
    by_user_demo.groupby("loyalty_status")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)
occupation_split = (
    by_user_demo.groupby("occupation")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
    .sort_values("revenue", ascending=False)
)

# user engagement - who ordered how much
user_orders = orders.groupby("user_id").agg(orders=("sales_amount", "count"), spend=("sales_amount", "sum"))
freq_bins = [0, 1, 2, 4, 9, 10**9]
freq_labels = ["1 (one-time)", "2-3", "4-9", "10-49", "50+"]
freq_split = (
    user_orders.assign(freq=pd.cut(user_orders["orders"], bins=freq_bins, labels=freq_labels, right=True))
    .groupby("freq", observed=False)["orders"]
    .size()
    .rename("users")
    .reset_index()
)

rating_band_split = (
    orders.merge(rest[["restaurant_id", "rating_band"]], on="restaurant_id", how="left")
    .groupby("rating_band")["restaurant_id"]
    .nunique()
    .rename("restaurants")
    .reset_index()
)

food_type_split = (
    orders.merge(menu.drop_duplicates(subset=["restaurant_id", "food_id"]), on="restaurant_id", how="inner")
    .merge(food[["food_id", "food_type"]], on="food_id", how="left")
    .drop_duplicates(subset=["user_id", "restaurant_id", "order_date", "food_id"])
    .groupby("food_type")["sales_amount"]
    .count()
    .rename("orders")
    .reset_index()
)

market = (
    rest.groupby("city")
    .agg(
        restaurants=("restaurant_id", "count"),
        avg_rating=("rating_num", "mean"),
        rating_mins=("rating_count_num", "sum"),
    )
    .reset_index()
    .sort_values("restaurants", ascending=False)
    .head(40)
)

weekday = (
    orders.groupby("day_name")
    .agg(revenue=("sales_amount", "sum"), orders=("sales_amount", "count"))
    .reset_index()
)

# top foods by value & rating trend
top_items = (
    menu.merge(food, on="food_id", how="left")
    .groupby("item")
    .agg(restaurants=("restaurant_id", "nunique"), avg_price=("price", "mean"))
    .reset_index()
    .sort_values("restaurants", ascending=False)
    .head(50)
)

# city list for slicers (from orders)
city_list = by_city[by_city["orders"] > 0]["city"].head(60).tolist()

payload = {
    "meta": {
        "date_min": str(orders["order_date"].min().date()),
        "date_max": str(orders["order_date"].max().date()),
        "total_orders": int(orders["sales_amount"].count()),
        "total_revenue": float(orders["sales_amount"].sum()),
        "total_users": int(users.shape[0]),
        "total_restaurants": int(rest.shape[0]),
        "total_menu_items": int(menu.shape[0]),
        "avg_rating": float(rest["rating_num"].mean().round(2)),
        "total_rated_restaurants": int(rest["rating_num"].notna().sum()),
        "aov": float(orders["sales_amount"].mean().round(1)),
    },
    "monthly": monthly.to_dict(orient="records"),
    "by_year": by_year.to_dict(orient="records"),
    "by_city": by_city.head(50).to_dict(orient="records"),
    "by_cuisine": by_cuisine.to_dict(orient="records"),
    "by_restaurant": by_restaurant.to_dict(orient="records"),
    "age_split": age_split.to_dict(orient="records"),
    "gender_split": gender_split.to_dict(orient="records"),
    "loyalty_split": loyalty_split.to_dict(orient="records"),
    "occupation_split": occupation_split.to_dict(orient="records"),
    "freq_split": freq_split.to_dict(orient="records"),
    "rating_band_split": rating_band_split.to_dict(orient="records"),
    "market": market.to_dict(orient="records"),
    "weekday": weekday.to_dict(orient="records"),
    "top_items": top_items.to_dict(orient="records"),
    "city_list": city_list,
}

def convert(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    return str(o)

json_path = os.path.join("dashboard", "src", "data", "swiggy.json")
os.makedirs(os.path.dirname(json_path), exist_ok=True)
with open(json_path, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, default=convert)
print("saved", json_path)

print("orders:", len(orders), "| menu deduped rows:", menu_deduped, "| nulls in sales_amount:", orders["sales_amount"].isna().sum())
print("date range:", orders["order_date"].min(), orders["order_date"].max())
