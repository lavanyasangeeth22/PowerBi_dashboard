import pandas as pd
import os

pd.set_option("display.width", 200)

for f in ["Food.csv", "Menu.csv", "Orders.csv", "Restaurant.csv", "Users.csv"]:
    p = os.path.join("data", "raw", f)
    full = pd.read_csv(p)
    print(f)
    print("=" * 70)
    print("COLUMNS:", list(full.columns))
    print("ROWS:", len(full))
    print("DTYPES:")
    print(full.dtypes.to_string())
    print("NULLS:")
    print(full.isna().sum().to_string())
    print("DUPLICATES:", full.duplicated().sum())
    print("HEAD:")
    print(full.head(3).to_string())
    print()
