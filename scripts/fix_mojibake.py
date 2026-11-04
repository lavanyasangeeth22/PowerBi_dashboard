import pathlib
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SRC = pathlib.Path("dashboard/src")
SRC2 = pathlib.Path("dashboard")  # include index.html
files = list(SRC.rglob("*")) + [SRC2 / "index.html"]
files = [p for p in files if p.suffix in (".jsx", ".js", ".css", ".html")]

def try_fix_char(c):
    """If char is part of double-encoded utf8 seen through cp1252, decode deeper."""
    b = c.encode("cp1252", errors="ignore")
    if not b:
        return None
    try:
        return b.decode("utf-8")
    except UnicodeDecodeError:
        return None

mojibake_pat = re.compile(r"[\xc0-\xdf][\x80-\xbf]+(?:[\xc0-\xdf][\x80-\xbf]+)*")

def fix_text(t):
    changed = 0

    def repl(m):
        nonlocal changed
        s = m.group(0)
        # up to 3 passes of cp1252 bytes -> utf8 decode
        for _ in range(3):
            try:
                b = s.encode("cp1252")
                s2 = b.decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                break
            s = s2
            changed += 1
        return s

    out = mojibake_pat.sub(repl, t)
    return out, changed

total = 0
for p in files:
    t = p.read_text(encoding="utf-8")
    fixed, n = fix_text(t)
    if n:
        p.write_text(fixed, encoding="utf-8", newline="\n")
        total += n
        print(f"fixed {n} seqs: {p}")

print("total fixes:", total)
