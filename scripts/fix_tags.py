import pathlib

BAD = "motion" + "-bloom"
GOOD = "div"

root = pathlib.Path(__file__).parent.parent
for p in root.rglob("*.tsx"):
    t = p.read_text(encoding="utf-8")
    if BAD in t:
        p.write_text(t.replace(BAD, "div"), encoding="utf-8")
        print("fixed", p)
