# Under the Hood — the agent engineer's academy

An interactive, story-driven learning website: 108 chapters across 12 acts, from
"why Python looks the way it does" to "build your own mini-harness", including
LangChain, LangGraph, deep agents, MCP/A2A, harness anatomy (context engineering,
memory, durability), the 2026 harness landscape, and the full GitLab workflow
(branches, merge requests, pipelines).

## Run it locally

The site is fully static, but the sidebar (nav.json fetch) and the in-browser
Python runner (Pyodide) need an HTTP server — opening files directly with
`file://` will not work.

```bash
cd academy
python3 -m http.server 8788
```

Then open <http://localhost:8788>.

Internet is needed for fonts, the code highlighter, and the first load of the
Python runner (Pyodide, ~10 MB from the jsDelivr CDN, cached afterwards).

## Structure

```
academy/
  index.html           landing page + journey map (renders from nav.json)
  nav.json             the single source of truth: acts, chapters, order
  chapters/            one HTML page per chapter (ch001 … ch108)
  assets/css/site.css  design system (light + dark themes)
  assets/js/site.js    sidebar, progress, quiz, walkthrough, stepper, viz components
  assets/js/pyrunner.js  lazy Pyodide loader for "Try it" blocks
  tools/validate_page.py  page contract validator (used during authoring)
  TEMPLATE-SPEC.md     the authoring contract every chapter follows
```

Progress and theme preference are stored in the browser's localStorage
(keys `uth-progress`, `uth-theme`) — nothing is sent anywhere.

## Publishing (optional, later)

The folder is self-contained and GitHub-Pages-ready (no build step). Serving it
from a private repo's Pages, or any static host, requires no changes.
