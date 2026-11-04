import pathlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# chars a cp1252 byte can decode to (the "mojibake alphabet")
CJK = None
alphabet = []
for b in range(256):
    try:
        ch = bytes([b]).decode("cp1252")
        alphabet.append(ch)
    except UnicodeDecodeError:
        pass
alpha_class = "".join(re.escape(c) for c in alphabet if c.isprintable() or c == "\xa0")
# lead chars: printable forms of utf-8 lead bytes 0xC2..0xF4
ALPHA_SET = set(alphabet)

# runs that start with a lead-looking char and continue with alphabet chars
pat = re.compile("([" + re.escape("ÂÃâÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ") + r"][" + alpha_class + r"]{1,12})")

def mojibake_candidates(t):
    for m in pat.finditer(t):
        s = m.group(1)
        out = s
        ok = False
        for _ in range(3):
            try:
                out = out.encode("cp1252").decode("utf-8")
                ok = True
            except (UnicodeEncodeError, UnicodeDecodeError):
                break
        if ok and out != m.group(1):
            yield m.group(1), out

files = []
for base in [pathlib.Path("dashboard/src"), pathlib.Path("dashboard")]:
    files += [p for p in base.rglob("*") if p.suffix in (".jsx", ".js", ".css", ".html", ".json")]
files = sorted(set(files))

total = 0
for p in files:
    t = p.read_text(encoding="utf-8")
    pairs = list(mojibake_candidates(t))
    if not pairs:
        continue
    for a, b in pairs:
        t = t.replace(a, b)
    p.write_text(t, encoding="utf-8", newline="\n")
    total += len(pairs)
    print(f"fixed {len(pairs)}: {p}")
    for a, b in pairs[:20]:
        print("   ", repr(a), "->", repr(b))

print("total:", total)
