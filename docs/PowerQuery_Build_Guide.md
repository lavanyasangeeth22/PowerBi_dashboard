# Power BI Build Guide — recreate this dashboard in Power BI Desktop

Height: video reference = Soft Byte's "Swiggy Power BI Dashboard Project" 4-part series. This guide reproduces the same project with the cleaned data shipped in `data/cleaned/`, even though the .pbix itself cannot be generated without Power BI Desktop (install from the Microsoft Store — free).

---

## 1. Load the data

Load the 5 csv files:

- `data/cleaned/Orders.csv` → **FactOrders**
- `data/cleaned/Restaurant.csv` → **DimRestaurant**
- `data/cleaned/Users.csv` → **DimUsers**
- `data/cleaned/Food.csv` → **DimFood**
- `data/cleaned/Menu.csv` → **FactMenu**

Or load the bundled workbook `data/cleaned/Swiggy_Dashboard_Model.xlsx` (5 sheets; FactMenu trimmed to 200k rows to stay within Excel's limit — prefer the CSVs to keep the full 823k-row menu).

## 2. Data cleaning (if using the RAW csvs instead)

Keep this applied-step ordering in Power Query, exactly as documented in `docs/data_cleaning.md`:

1. Header trim + lowercase with underscores
2. Text hygiene (Trim, Title case)
3. Food: remove duplicate `item` rows
4. Restaurant: split `city` on comma → `locality` + `city`
5. Restaurant: `rating` → number, text `--` becomes null (Transform → Replace → error → keep null)
6. Restaurant: `rating_count` text bucket → numeric map (Add Conditional Column, then rename)
7. Restaurant: banded `rating_band` column + `cuisine_main` (first token of cuisine)
8. Orders: replace `sales_amount` values ≤ 0 with null
9. Orders: type `order_date` as Date, add derived columns via `Date.Year`, `Date.Month`, `Date.QuarterOfYear`, `Date.ToText` (month name), `Date.DayOfWeekName`, custom `year_month` = `Date.ToText([order_date], "yyyy-MM")`
10. Orders: replace null/unmatched `restaurant_id` with 0 ("Unassigned")
11. Menu: add `menu_key` = `Text.From([restaurant_id]) & "_" & Text.From([food_id])`, dedupe on it
12. Menu: Prices ≤ 0 → null, then **Fill Down** logic: GroupBy cuisine → median price for imputation (or simpler: Replace null with the cuisine median table join)
13. Users: custom `age_group` with conditional logic (18–21, 22–25, 26–29, 30–33)
14. Rename `marital_status` → `loyalty_status`

## 3. Data model (star schema)

Relationships (1 → many, single-direction):

```
DimUsers[user_id]          → FactOrders[user_id]
DimRestaurant[restaurant_id] → FactOrders[restaurant_id]
DimRestaurant[restaurant_id] → FactMenu[restaurant_id]
DimFood[food_id]           → FactMenu[food_id]
DimDate[Date]              → FactOrders[order_date]   (mark DimDate as date table)
```

Create `DimDate` with DAX:

```dax
DimDate =
ADDCOLUMNS(
    CALENDAR(DATE(2017,10,1), DATE(2020,6,30)),
    "Year", YEAR([Date]),
    "Month Number", MONTH([Date]),
    "Month Name", FORMAT([Date], "MMM"),
    "Year Month", FORMAT([Date], "yyyy-MM"),
    "Quarter", "Q" & FORMAT([Date], "Q"),
    "Day Name", FORMAT([Date], "ddd"),
    "Is Weekend", IF(WEEKDAY([Date], 2) > 5, TRUE, FALSE)
)
```

Hide the key columns from report view; keep slicer-friendly columns (city, cuisine_main, rating_band, age_group, gender, loyalty_status, day_name, year_month) as text.

## 4. Paste the DAX measures

See `docs/DAX_Measures.md` — create them inside the FactOrders table group.

## 5. Page-by-page build (visual layout)

### Page 1 — Executive Overview
Background: dark (or Swiggy branding block from `data/raw/All Images/`).

| Visual | Field mapping |
|---|---|
| 5 Card visuals | Total Revenue, Total Orders, Avg Order Value, Avg Restaurant Rating, Registered Users |
| Area chart (X: year_month, Y: Total Revenue) | FactOrders |
| Bar chart top cities (X: city, Y: Total Revenue) | DimRestaurant→FactOrders |
| Donut (Legend: rating_band, Values: Restaurant Count) | DimRestaurant |
| Slicer panel | city (dim), year (DimDate), gender, cuisine (dropdown) |

### Page 2 — Orders & Revenue
- Combo chart (line + column): X year_month, column Total Revenue, line Total Orders (secondary axis)
- Column chart: X year, Y Total Revenue (YoY)
- Bar chart: Top 10 cities by orders (Visual → TopN filter, Top 10, By Total Orders)
- Table: year_month, Total Revenue, Total Orders, AOV, MoM Growth %
- Slicers: year quarter, day_name

### Page 3 — Customer Intelligence
- KPI cards: Active Customers, Orders per Customer, One-time Customers
- Donut: gender × Total Revenue
- Bar: age_group × Total Revenue
- Bar: loyalty_status × Total Revenue
- Bar: occupation × Total Revenue
- Slicers: gender, age_group

### Page 4 — Restaurant Performance
- KPI cards: Restaurant Count, Avg Rating, Rated %
- Bar: top 10 restaurants by revenue (name × Total Revenue)
- Column: rating_band × Restaurant Count
- Scatter: Avg Rating (X) vs Total Revenue (Y), size Total Orders, Distinct restaurant name
- Table: city, partners, avg rating, rating volume

### Page 5 — Menu & Delivery
- KPI cards: menu lines, veg/non-veg share, median price
- Bar: top dishes (item × restaurant count via FactMenu)
- Donut: Food_Type share
- Histogram: price_band
- Delivery KPI block: the raw dataset has no fleet logs — present using static/text cards as "ops snapshot" and note the simulation (same as the web dashboard)

## 6. Theme

- Primary color `#FC8019` (Swiggy orange)
- Sidebar/canvas: `#211D35` dark navy
- Font: Segoe UI
- Apply via View → Themes → Customize JSON (set `backgroundColor`, `foreground` palette with the orange ramp 1–3)

## 7. Slicer interactions

Default behavior in Power BI (slicers cross-filter all visuals on the page) mirrors the web dashboard behavior. For the Executive page, groom interactions via Format → Edit interactions if you want the KPI cards unaffected by the city slicer.

---

## Web dashboard mapping (what's implemented in the React version)

| Web dashboard | Power BI equivalent |
|---|---|
| City / Year / Cuisine slicers | Slicer visuals with precomputed fact files (facts replace Power BI's live relationships) |
| Live Order Stream (2.5 s refresh) | Simulated: a paginated filter or RLS demo; Power BI Pro has no in-file realtime streaming — use **Push Datasets**/Stream datasets if you truly want the ticking counter |
| Monthly Revenue Trend | Area chart + time intelligence |
| MoM growth pill table | DAX MoM Growth % + conditional formatting |
| Rating bands donut | Same field mapping |
| AI insights card | Power BI "Smart narrative" visual |
