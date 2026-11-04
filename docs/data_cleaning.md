# Data Cleaning Documentation — Swiggy Dashboard Project

Every transformation applied from raw → cleaned, in company-standard format (what would be written in a Power Query *Applied Steps* description). Source: the Soft Byte video's Google Drive bundle (Food.csv, Menu.csv, Orders.csv, Restaurant.csv, Users.csv).

## Profile of raw data (before cleaning)

| Table | Rows | Columns | Condition |
|---|---|---|---|
| Orders | 150,281 | order_date, Sales_QTY, Sales_amount, currency, User_id, Restaurant_id | Dirty |
| Restaurant | 148,454 | Restaurant_id, Name, Country, City, Rating, Rating_count, Cuisine | Dirty |
| Menu | 1,048,574 | Menu_id, Restaurant_id, Food_id, Cuisine, Price | Dirty |
| Food | 371,552 | Food_id, Item, Food_Type | Dirty |
| Users | 100,000 | User_id, Name, Age, Gender, Marital Status, Occupation | Clean-ish |

---

## Step 01 — Header standardization
- Trimmed spaces from all headers and lower-cased with underscores (`Sales_amount` → `sales_amount`, `Marital Status` → `marital_status`).
- **Why:** consistent column names across all 5 tables so joins and DAX references never break.

## Step 02 — Text hygiene
- Trimmed leading/trailing whitespace on every text column (`name`, `cuisine`, `gender`).
- Title-cased `Item` values in Food and `Name` values in Users.
- **Why:** `"pizza "` and `"pizza"` otherwise count as two different keys after grouping.

## Step 03 — Food: remove duplicate items
- Dropped duplicate `Item` names in `Food.csv` (2,205 duplicated names found) — kept the first `Food_id`.
- `Food_Type` normalized to title case (`Veg` / `Non-Veg`).

## Step 04 — Restaurant: split City into Locality + Metro City
- Raw City column mixes locality and metro city: `BTM,Bangalore`, `Indirapuram,Delhi`.
- Split on first comma: `locality` (new column) + `city` (metro: Delhi, Bangalore, Pune, Mumbai, Hyderabad, Chennai, Ahmedabad, …).
- **Why:** 821 raw city strings → meaningful metro-city analysis and a clean city slicer.

## Step 05 — Restaurant: fix Rating
- `Rating` contained text `--` (87,013 rows — restaurants with too few ratings) → converted to **null** via numeric cast so averages are not distorted.
- Same pass converts the column from text to decimal number.

## Step 06 — Restaurant: standardize Rating_count
- Text buckets `Too Few Ratings`, `20+ ratings`, `50+ ratings`, `100+ ratings`, `500+ ratings`, `1K+ / 5K+ / 10K+ ratings` → mapped to numeric lower bounds (0 / 20 / 50 / 100 / 500 / 1000 / 5000 / 10000) in `rating_count_num`.
- **Why:** text buckets cannot be summed; numbers can.

## Step 07 — Restaurant: derived Rating Band
- Banded ratings: `<2.0`, `2.0–3.0`, `3.0–3.5`, `3.5–4.0`, `4.0–5.0`, `Not Rated` (for nulls).
- Also extracted first cuisine into `cuisine_main` for the top-cuisine visual.

## Step 08 — Orders: invalid sales amount
- `Sales_amount` contains **-1** on 1,611 rows (corrupt entries) → replaced with null.
- Revenue measures (`SUM`) ignore nulls automatically; `COUNT` counts the row so order volume stays truthful.

## Step 09 — Orders: Sales_QTY sanity
- `Sales_QTY` ranges 1 → 14,049 (bulk orders). No zeros found; clipped to min 1 as a guard.

## Step 10 — Orders: orphan Restaurant_id
- 1,617 blank `Restaurant_id` + 87 values not present in Restaurant table
- Unknown restaurant ids are not silently dropped (that would lose ₹ revenue); they are kept and tagged as: matched → original id, unmatched/blank → `0` = "Unassigned".

## Step 11 — Orders: date typing & calendar columns
- `order_date` parsed to proper Date type (was text). All 150,281 dates valid; range **2017-10-04 → 2020-06-26**.
- Derived: `year`, `month`, `month_name`, `year_month`, `quarter`, `day_name`, `date_key (YYYYMMDD int)` for the Date dimension.

## Step 12 — Menu: non-unique Menu_id
- `Menu_id` repeats **130k+ times** across restaurants (`mn0` for restaurant A and B). Created a new unique key: `menu_key = restaurant_id + food_id`, dropped exact key duplicates (110,032 rows).
- **Why:** a dimension key must be unique or relationships fan out wrongly in Power BI.

## Step 13 — Menu: invalid prices
- 899 rows with `Price ≤ 0` → nulled, then imputed with the **median price of that cuisine** (never 0).
- Price banding added: Budget (<100) / Value (100–200) / Mid (200–300) / Premium (300–500) / Luxury (500+).

## Step 14 — Menu: orphan keys
- 273 `Restaurant_id` values and 1,204 `Food_id` values not present in their dimension tables → filtered out of Menu only (they cannot be related in a model).

## Step 15 — Users: straighten & segment
- No nulls (verify), Age range 18–33 verified.
- Derived `age_group`: 18–21 / 22–25 / 26–29 / 30–33.
- `Marital Status` → `loyalty_status` (Single / Married / Prefer Not To Say).

---

## Cleaning results

| Table | Before | After | Removed/Fixed |
|---|---|---|---|
| Orders | 150,281 | 150,281 | 1,611 amounts nulled, 2,704 restaurant ids tagged |
| Restaurant | 148,454 | 148,454 | 87,013 ratings → Not Rated; city split |
| Menu | 1,048,574 | 823,698 | 110,032 key dups + 214,844 orphan rows removed |
| Food | 371,552 | 371,550 | 2 duplicate items |
| Users | 100,000 | 100,000 | — |

Final model total revenue: **₹98.65 Cr** across 148,670 valid orders.

## Files

- `data/cleaned/Food.csv`, `Menu.csv`, `Orders.csv`, `Restaurant.csv`, `Users.csv`
- `data/cleaned/Swiggy_Dashboard_Model.xlsx` — 5-sheet workbook (FactOrders, DimUsers, DimRestaurant, FactMenu, DimFood) ready to load into Power BI. (FactMenu capped at 200k rows to stay inside Excel limits — use the CSVs for the full table.)
- `dashboard/src/data/swiggy.json` — pre-aggregated dataset powering the web dashboard.
