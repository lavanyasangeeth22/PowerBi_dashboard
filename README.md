# Swiggy Sales & Performance Dashboard

End-to-end replica of the "Swiggy Power BI Dashboard Project" (Soft Byte, 2025) delivered as a **working React web dashboard plus the complete Power BI rebuild kit**.

The dataset is the exact bundle from the video's Google Drive (Food, Menu, Orders, Restaurant, Users csv — 2017-10 → 2020-06, India). Educational use only; not affiliated with Swiggy.

## Quick start

```powershell
cd dashboard
npm install     # only needed once
npm run dev     # open http://localhost:5173
```

## What you get

- **Executive Overview** — revenue/orders/AOV/rating/users KPIs, monthly revenue trend, top cities, weekday pattern, rating bands, top cuisines, **live order stream** (simulated realtime, refreshes every 2.5 s), auto-rotating insights, YoY and latest-month snapshots.
- **Orders & Revenue** — revenue+orders combo trend with MoM growth, YoY by year, orders by city, quarterly seasonality, month-wise detail table.
- **Customer Intelligence** — gender split, age bands, loyalty, occupation, order-frequency segments, plus local gender/age filter chips.
- **Restaurant Performance** — top 10 restaurants, rating bands, avg rating by city, market snapshot table, revenue-vs-rating bubble chart.
- **Menu & Operations** — best-selling dishes, price bands, veg/non-veg mix, cuisine revenue table, peak-hour load + fleet snapshot.

Global slicers (City · Year · Cuisine) re-aggregate every visual like Power BI slicers. Pages are deep-linkable via hash (`#sales`, `#customers`, ...).

## Project layout

```
data/raw/                     original dataset (csv + images) from the Drive bundle
data/cleaned/                 cleaned csvs + Swiggy_Dashboard_Model.xlsx (PBI-ready)
docs/data_cleaning.md         every cleaning step, company-standard documentation
docs/DAX_Measures.md          all DAX for the Power BI build
docs/PowerQuery_Build_Guide.md step-by-step Power BI rebuild guide
dashboard/                    React + Vite + Recharts app
  src/data/*.json             pre-aggregated facts consumed by the dashboard
scripts/profile.py            raw data profiler
scripts/profile2.py           data-quality probe
scripts/pipeline.py           clean → star schema → xlsx → aggregates
scripts/export_facts.py       slicer-aware fact tables for the web dashboard
```

## Numbers (unfiltered)

- Revenue **₹98.66 Cr** · Orders **1,48,670** · AOV **₹6,636**
- 1,00,000 users · 1,48,454 restaurants · 61,441 rated (avg 3.89★)
- Menu mappings 8,23,698 · Peak cities: Delhi, Bangalore, Ahmedabad, Pune, Chennai

## Rebuild in Power BI

Install Power BI Desktop (free, Microsoft Store), load `data/cleaned/*.csv`, then follow `docs/PowerQuery_Build_Guide.md` + `docs/DAX_Measures.md`.

## Regenerating the data layer

```powershell
python scripts/pipeline.py      # clean + xlsx + swiggy.json aggregates
python scripts/export_facts.py  # slicer fact tables for the web dashboard
```
