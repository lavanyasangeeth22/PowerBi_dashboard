import pathlib

css = pathlib.Path("dashboard/src/theme.css")
t = css.read_text(encoding="utf8")

pairs = [
    (
        'body {\n  font-family: "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;',
        'body {\n  font-family: "Manrope", "Segoe UI", system-ui, sans-serif;\n  font-feature-settings: "tnum" 1;',
    ),
    (
        '.nav-caption {\n  font-size: 9.5px;\n  font-weight: 700;\n  letter-spacing: 2px;\n  text-transform: uppercase;\n  opacity: 0.45;\n  padding: 14px 24px 4px;\n}',
        '.nav-caption {\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0;\n  opacity: 0.5;\n  padding: 16px 24px 4px;\n}',
    ),
    (
        ".topbar h1 { font-size: 21px; font-weight: 700; }",
        '.topbar h1 { font-size: 22px; font-weight: 700; font-family: "Space Grotesk", "Manrope", sans-serif; }',
    ),
    (
        '.live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--swiggy-orange); animation: pulse 1.4s infinite; }\n@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(252,128,25,.55);} 70% { box-shadow: 0 0 0 8px rgba(252,128,25,0);} 100% { box-shadow: 0 0 0 0 rgba(252,128,25,0);} }',
        ".live-dot { width: 7px; height: 7px; border-radius: 50%; background: #d95a00; }",
    ),
    (
        ".slicer label { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: var(--muted); text-transform: uppercase; }",
        ".slicer label { font-size: 11.5px; font-weight: 600; color: var(--muted); }",
    ),
    (
        ".kpi .label { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); }",
        ".kpi .label { font-size: 12.5px; font-weight: 600; color: var(--muted); }",
    ),
    (
        ".kpi .value { font-size: 24px; font-weight: 750; letter-spacing: -0.5px; }",
        '.kpi .value { font-size: 25px; font-weight: 700; letter-spacing: -0.3px; font-family: "Space Grotesk", "Manrope", sans-serif; }',
    ),
    (
        "table.dtable th { text-align: left; font-size: 10.5px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted);",
        "table.dtable th { text-align: left; font-size: 11.5px; font-weight: 600; letter-spacing: 0; color: var(--muted);",
    ),
    (
        ".card h3 { font-size: 13.5px; font-weight: 700; margin-bottom: 4px; }",
        '.card h3 { font-size: 14px; font-weight: 700; margin-bottom: 4px; font-family: "Space Grotesk", "Manrope", sans-serif; }',
    ),
]

for a, b in pairs:
    if a not in t:
        print("NOT FOUND:", a[:60])
    t = t.replace(a, b)

css.write_text(t, encoding="utf8", newline="\n")
print("css updated")
