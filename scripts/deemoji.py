import re
import pathlib

SRC = pathlib.Path("dashboard/src")

target_files = list(SRC.rglob("*.jsx")) + list(SRC.rglob("*.js"))

for p in target_files:
    t = p.read_text(encoding="utf-8")
    orig = t
    # strip unused icon props on <Kpi ...>
    t = re.sub(r'\s*icon="[^"]*"', "", t)
    if t != orig:
        p.write_text(t, encoding="utf-8", newline="\n")
        print("stripped icon props:", p.name)

# app-specific replacements
def patch(name, replacements):
    p = SRC / name
    t = p.read_text(encoding="utf-8")
    for a, b in replacements:
        t = t.replace(a, b)
    p.write_text(t, encoding="utf-8", newline="\n")
    print("patched:", name)

patch("pages/Overview.jsx", [
    ("LIVE · orders flowing in", "Live feed · 2.5s refresh"),
    ('icon: ["🍔", "🍕", "🍛", "🍱", "🥘", "🍜"][Math.floor(Math.random() * 6)],\n        ', ""),
    ('icon: ["🍔", "🍕", "🍛", "🍱", "🥘", "🍜"][Math.floor(Math.random() * 6)],', ""),
])

patch("pages/MenuDelivery.jsx", [
    ('<img src="/img/veg.png" alt="veg" style={{ height: 46, borderRadius: 8 }} />', ""),
    ('<img src="/img/nonveg.png" alt="non veg" style={{ height: 46, borderRadius: 8 }} />', ""),
    ('<img src="/img/delivery.png" alt="delivery" style={{ width: 120, borderRadius: 12 }} />', ""),
])

# remove now-empty <div className="feedicon"> lines
for p in ["pages/Overview.jsx"]:
    p2 = SRC / p
    t = p2.read_text(encoding="utf-8")
    t = re.sub(r'\s*<div className="feedicon">.*?</div>', "", t)
    p2.write_text(t, encoding="utf-8", newline="\n")

print("done")
