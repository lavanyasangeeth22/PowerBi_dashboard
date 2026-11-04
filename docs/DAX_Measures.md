# DAX Measures — Swiggy Dashboard

Paste these into the **FactOrders** table (New measure). The model assumes the star schema in `PowerQuery_Build_Guide.md`.

## Core sales measures

```dax
Total Revenue = SUM(FactOrders[sales_amount])

Total Orders = COUNTROWS(FactOrders)

Avg Order Value = DIVIDE([Total Revenue], [Total Orders], 0)

Valid Orders =
CALCULATE(
    [Total Orders],
    KEEPFILTERS(FactOrders[sales_amount] > 0)
)

Revenue per User =
DIVIDE([Total Revenue], DISTINCTCOUNT(FactOrders[user_id]), 0)
```

## Time intelligence (needs a Date table marked as date, named `DimDate`)

```dax
Revenue YTD =
TOTALYTD([Total Revenue], DimDate[Date])

Revenue MTD =
TOTALMTD([Total Revenue], DimDate[Date])

Revenue PY =
CALCULATE([Total Revenue], SAMEPERIODLASTYEAR(DimDate[Date]))

Revenue YoY % =
VAR cur = [Total Revenue]
VAR prev = [Revenue PY]
RETURN DIVIDE(cur - prev, prev, 0)

MoM Growth % =
VAR cur = [Total Revenue]
VAR prev =
    CALCULATE(
        [Total Revenue],
        DATEADD(DimDate[Date], -1, MONTH)
    )
RETURN DIVIDE(cur - prev, prev, 0)
```

> Note: the raw data spans 2017-10 → 2020-06 with no date gaps guaranteed. Build `DimDate` with `CALENDAR("2017-10-01","2020-06-30")` and mark it as a date table.

## Restaurant measures

```dax
Restaurant Count =
DISTINCTCOUNT(DimRestaurant[restaurant_id])

Avg Restaurant Rating =
AVERAGEX(
    VALUES(DimRestaurant[restaurant_id]),
    CALCULATE(MAX(DimRestaurant[rating_num]))
)

Rated Restaurant % =
VAR rated =
    CALCULATE(
        COUNTROWS(DimRestaurant),
        KEEPFILTERS(DimRestaurant[rating_num] > 0)
    )
VAR allr = COUNTROWS(DimRestaurant)
RETURN DIVIDE(rated, allr, 0)
```

## Customer measures

```dax
Registered Users = COUNTROWS(DimUsers)

Active Customers =
DISTINCTCOUNT(FactOrders[user_id])

One-time Customers =
VAR c =
    FILTER(
        VALUES(FactOrders[user_id]),
        CALCULATE([Total Orders]) = 1
    )
RETURN COUNTROWS(c)

Repeat Rate =
DIVIDE(1 - [One-time Customers] / CALCULATE([Active Customers], ALL(DimAge)), 1, 0)

Orders per Customer =
DIVIDE([Total Orders], [Active Customers], 0)
```

## Dynamic KPI titles (layered slicer awareness)

```dax
KPI Revenue Title =
SELECTEDVALUE(DimRestaurant[city], "All cities") & " · Revenue: "
    & FORMAT([Total Revenue], "₹#,##0.00,,\" Cr\"")

KPI Chosen Top City =
TOPN(1, VALUES(DimRestaurant[city]), [Total Revenue], DESC)
```

## Snippet: Top-N restaurant with dynamic rank

```dax
Top Restaurant Name =
MAXX(
    TOPN(1, ALL(DimRestaurant), [Total Revenue], DESC),
    DimRestaurant[name]
)
```
