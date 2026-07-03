#!/usr/bin/env python3
"""Validate an Under the Hood chapter page against TEMPLATE-SPEC.md.

Usage (from the academy/ folder):
    python3 tools/validate_page.py chapters/ch045-react-loop-by-hand.html
    python3 tools/validate_page.py --all

Exit code 0 = all files pass (warnings allowed), 1 = at least one FAIL.
"""

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ACADEMY = Path(__file__).resolve().parent.parent
NAV = json.loads((ACADEMY / "nav.json").read_text(encoding="utf-8"))

VOID = {"meta", "link", "br", "hr", "img", "input", "source", "wbr", "area", "base", "col", "embed", "track", "param"}

EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF⭐❤️✅❌❗✨⬆⬇]"
)
BANNED_WORDS = ["UBS", "Maverick", "Nucleus", "Cowork", "Co-Work"]
PLACEHOLDER_RE = re.compile(r"\bTODO\b|\bFIXME\b|XXX\b|(?i:lorem ipsum|\{Chapter title\}|\{chNNN\})")


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []
        self.text_parts = []

    @property
    def classes(self):
        return (self.attrs.get("class") or "").split()

    def text(self):
        out = list(self.text_parts)
        for c in self.children:
            out.append(c.text())
        return " ".join(out)

    def walk(self):
        yield self
        for c in self.children:
            yield from c.walk()

    def find_all(self, tag=None, cls=None, attr=None):
        for n in self.walk():
            if tag and n.tag != tag:
                continue
            if cls and cls not in n.classes:
                continue
            if attr and attr not in n.attrs:
                continue
            if n is self:
                continue
            yield n


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root", [])
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].children.append(Node(tag, attrs, self.stack[-1]))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        if data.strip():
            self.stack[-1].text_parts.append(data.strip())


def chapters_index():
    idx = {}
    order = []
    for act in NAV["acts"]:
        for ch in act["chapters"]:
            idx[ch["slug"]] = {"id": ch["id"], "title": ch["title"], "act": act}
            order.append(ch["slug"])
    return idx, order


def validate(path: Path):
    fails, warns = [], []
    raw = path.read_text(encoding="utf-8")
    idx, order = chapters_index()
    slug = path.name

    if slug not in idx:
        fails.append(f"{slug} is not a slug in nav.json")
        return fails, warns
    meta = idx[slug]

    # ---- raw-text checks ----
    if not raw.lstrip().lower().startswith("<!doctype html>"):
        fails.append("missing <!DOCTYPE html>")
    for needle, what in [
        ('../assets/css/site.css', "site.css link"),
        ('../assets/js/site.js', "site.js script"),
        ('../assets/js/pyrunner.js', "pyrunner.js script"),
        ('id="sidebar"', "sidebar element"),
        ('class="skip"', "skip link"),
        ('data-chnav', "chapter-nav placeholder"),
        ('data-complete', "complete button"),
        ('uth-theme', "theme bootstrap script"),
    ]:
        if needle not in raw:
            fails.append(f"missing {what} ({needle})")

    m = re.search(r'<body[^>]*data-chapter="([^"]+)"', raw)
    if not m:
        fails.append("body is missing data-chapter")
    elif m.group(1) != meta["id"]:
        fails.append(f'data-chapter="{m.group(1)}" but nav.json says {meta["id"]}')

    emojis = set(EMOJI_RE.findall(raw))
    if emojis:
        fails.append(f"emoji characters found: {' '.join(sorted(emojis))}")

    for w in BANNED_WORDS:
        if re.search(r"\b" + re.escape(w) + r"\b", raw):
            fails.append(f"banned internal reference: {w}")

    pm = PLACEHOLDER_RE.search(raw)
    if pm:
        fails.append(f"placeholder/incomplete text found: {pm.group(0)!r}")

    if "<img" in raw or "<iframe" in raw:
        fails.append("no <img>/<iframe> allowed — use HTML/CSS/SVG diagrams")

    # ---- tree checks ----
    tb = TreeBuilder()
    tb.parse_error = None
    try:
        tb.feed(raw)
    except Exception as e:  # noqa: BLE001
        fails.append(f"HTML parse error: {e}")
        return fails, warns
    root = tb.root

    h1s = list(root.find_all(tag="h1"))
    if len(h1s) != 1:
        fails.append(f"expected exactly one <h1>, found {len(h1s)}")
    else:
        h1 = re.sub(r"\s+", " ", h1s[0].text()).strip()
        want = re.sub(r"\s+", " ", html.unescape(meta["title"])).strip()
        if h1.lower() != want.lower():
            fails.append(f'h1 "{h1}" does not match nav.json title "{want}"')

    for cls, what in [("ch-kicker", "hero kicker"), ("ch-tagline", "hero tagline"),
                      ("ch-meta", "hero meta"), ("story", "story panel"),
                      ("takeaways", "takeaways section")]:
        if not list(root.find_all(cls=cls)):
            fails.append(f"missing required element .{cls} ({what})")

    kick = next(iter(root.find_all(cls="ch-kicker")), None)
    if kick and meta["act"]["num"] not in kick.text():
        warns.append(f'kicker does not mention Act {meta["act"]["num"]}')

    story = next(iter(root.find_all(cls="story")), None)
    if story:
        n = len(story.text().split())
        if n < 80:
            warns.append(f"story is short ({n} words; aim 120-250)")

    if not list(root.find_all(cls="wild")):
        fails.append('missing required "In the wild" callout (.callout.wild)')

    take = next(iter(root.find_all(cls="takeaways")), None)
    if take and len(list(take.find_all(tag="li"))) < 4:
        fails.append("takeaways needs at least 4 bullets")

    # quiz
    quizzes = list(root.find_all(cls="quiz"))
    if not quizzes:
        fails.append("missing quiz")
    else:
        qs = [q for quiz in quizzes for q in quiz.find_all(cls="q")]
        if len(qs) < 3:
            fails.append(f"quiz has {len(qs)} questions; need at least 3")
        for i, q in enumerate(qs, 1):
            ans = q.attrs.get("data-answer", "").strip().lower()
            opts = [b.attrs.get("data-opt", "").strip().lower()
                    for b in q.find_all(tag="button", attr="data-opt")]
            if not ans:
                fails.append(f"quiz question {i}: missing data-answer")
            elif ans not in opts:
                fails.append(f"quiz question {i}: data-answer {ans!r} not among options {opts}")
            if len(opts) < 2:
                fails.append(f"quiz question {i}: needs at least 2 options")
            if not list(q.find_all(cls="q-explain")):
                fails.append(f"quiz question {i}: missing .q-explain")

    # interactivity minimums
    kinds = {
        "walkthrough": bool(list(root.find_all(cls="walkthrough"))),
        "stepper": bool(list(root.find_all(cls="stepper"))),
        "pyrun": bool(list(root.find_all(cls="pyrun"))),
        "flipgrid": bool(list(root.find_all(cls="flipgrid"))),
        "viz": bool(list(root.find_all(attr="data-bars")) or list(root.find_all(cls="viz-tiles"))),
    }
    have = [k for k, v in kinds.items() if v]
    if len(have) < 2:
        fails.append(f"needs at least 2 interactive components besides the quiz; found {have or 'none'}")

    for s in root.find_all(cls="stepper"):
        if len(list(s.find_all(cls="step"))) < 2:
            fails.append("stepper has fewer than 2 steps")

    # code blocks must declare a language
    for pre in root.find_all(tag="pre"):
        if "py-out" in pre.classes:
            continue
        code = next(iter(pre.find_all(tag="code")), None)
        if code is not None and not any(c.startswith("language-") for c in code.classes):
            warns.append("a <pre><code> block has no language- class")

    # pyrun content sanity
    for ta in root.find_all(tag="textarea", cls="py-src"):
        body = ta.text()
        for bad in ("import requests", "urllib.request", "micropip", "input("):
            if bad in body:
                warns.append(f"pyrun uses {bad!r} — will not work in the browser sandbox")

    # local links resolve
    valid_slugs = set(idx.keys())
    for a in root.find_all(tag="a", attr="href"):
        href = a.attrs["href"]
        if href.startswith(("http://", "https://", "#", "mailto:")):
            continue
        target = href.split("#")[0]
        if target in ("", "../index.html", "index.html"):
            continue
        if target not in valid_slugs:
            fails.append(f"broken local link: {href}")

    # prose volume
    text = re.sub(r"<(script|style|pre|textarea|code)[\s\S]*?</\1>", " ", raw, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    words = len(html.unescape(text).split())
    if words < 1100:
        fails.append(f"prose too thin: ~{words} words (need >= 1,100; aim 1,400-2,600)")
    elif words < 1300:
        warns.append(f"prose on the light side: ~{words} words (aim 1,400-2,600)")
    elif words > 3400:
        warns.append(f"prose very long: ~{words} words (aim 1,400-2,600)")

    return fails, warns


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    if args == ["--all"]:
        files = sorted((ACADEMY / "chapters").glob("ch*.html"))
    else:
        files = [Path(a) if Path(a).is_absolute() else ACADEMY / a for a in args]

    any_fail = False
    for f in files:
        if not f.exists():
            print(f"[FAIL] {f.name}: file not found")
            any_fail = True
            continue
        fails, warns = validate(f)
        if fails:
            any_fail = True
            print(f"[FAIL] {f.name}")
            for x in fails:
                print(f"   FAIL: {x}")
        else:
            print(f"[PASS] {f.name}" + (f"  ({len(warns)} warnings)" if warns else ""))
        for x in warns:
            print(f"   warn: {x}")
    sys.exit(1 if any_fail else 0)


if __name__ == "__main__":
    main()
