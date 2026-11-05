import pathlib

edits = {
    "dashboard/src/pages/Overview.jsx": [
        (
            '<div className="label" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#d95a00" }}>TODAY\'S REVENUE</div>',
            '<div className="label" style={{ fontSize: 11.5, fontWeight: 600, color: "#d95a00" }}>Today\'s revenue</div>',
        ),
        (
            '<div className="label" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "#4c6fff" }}>TODAY\'S ORDERS</div>',
            '<div className="label" style={{ fontSize: 11.5, fontWeight: 600, color: "#4c6fff" }}>Today\'s orders</div>',
        ),
    ],
    "dashboard/src/pages/MenuDelivery.jsx": [
        (
            '<div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: "#7a7790", textTransform: "uppercase" }}>{k.label}</div>',
            '<div style={{ fontSize: 11.5, fontWeight: 600, color: "#7a7790" }}>{k.label}</div>',
        ),
    ],
}

for name, pairs in edits.items():
    p = pathlib.Path(name)
    t = p.read_text(encoding="utf8")
    for a, b in pairs:
        if a not in t:
            print("NOT FOUND in", name, ":", a[:70])
        t = t.replace(a, b)
    p.write_text(t, encoding="utf8", newline="\n")

# Customers.jsx line 56: normalize the inline uppercase filter label
p = pathlib.Path("dashboard/src/pages/Customers.jsx")
t = p.read_text(encoding="utf8")
t = t.replace(', textTransform: "uppercase", letterSpacing: 1', "")
p.write_text(t, encoding="utf8", newline="\n")

print("done")
