import re
import pathlib
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")

BASE = pathlib.Path("dashboard/src")

MAP = [
    ("\u00e2\u20ac\u201c", "\u2013"),
    ("\u00e2\u20ac\u201d", "\u2014"),
    ("\u00e2\u20ac\u02dc", "\u2018"),
    ("\u00e2\u20ac\u2122", "\u2019"),
    ("\u00e2\u20ac\u0153", "\u201c"),
    ("\u00e2\u20ac\x9d", "\u201d"),
    ("\u00e2\u20ac\u00a6", "\u2026"),
    ("\u00e2\u20ac\u2039", "\u0203".replace("0203", "2039")),
    ("\u00e2\u20b9", "\u20b9"),
    ("\u00c3\u00d7", "\u00d7"),
    ("\u00c2\u00b7", "\u00b7"),
    ("\u00c3\u00a9", "\u00e9"),
    ("\u00c3\u00a8", "\u00e8"),
    ("\u00c3\u00a1", "\u00e1"),
    ("\u00c3\u00b3", "\u00f3"),
    ("\u00c3\u00b1", "\u00f1"),
    ("\u00c3\u00bc", "\u00fc"),
    ("\u00c3\u00b6", "\u00f6"),
]

files = list(BASE.rglob("*.jsx")) + list(BASE.rglob("*.js")) + list(BASE.rglob("*.json"))
fixed_files = 0
for p in files:
    t = p.read_text(encoding="utf8")
    orig = t
    for a, b in MAP:
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t, encoding="utf8", newline="\n")
        fixed_files += 1
        print("fixed:", p)

bad = 0
for p in files:
    t = p.read_text(encoding="utf8")
    for m in re.finditer("[\u00c2\u00c3\u00e2][\u0080-\u00ff\u2018\u2019\u201c\u201d\u2013\u2014\u2026\u20ac\u2122\u0160\u0161\u0152\u0153\u017d\u017e\u0192\u201a\u201e\u2020\u2021\u2030\u2039\u203a\u02c6\u02dc\u2022]", t):
        bad += 1
        print("RESIDUAL", p.name, repr(t[max(0, m.start() - 30):m.start() + 30]))
print("files fixed:", fixed_files, "residual:", bad)
