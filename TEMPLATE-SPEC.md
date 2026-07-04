# Chapter authoring contract — Under the Hood

Every chapter page in `chapters/` follows this contract exactly. The gold-standard
example is `chapters/ch045-react-loop-by-hand.html` — read it before writing.
Validate with `python3 tools/validate_page.py chapters/<file>` and fix until it passes.

## 1. File skeleton (exact)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{Chapter title} — Under the Hood</title>
<script>(function(){var t=localStorage.getItem("uth-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../assets/css/site.css">
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-core.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/plugins/autoloader/prism-autoloader.min.js" defer></script>
<script src="../assets/js/site.js" defer></script>
<script src="../assets/js/pyrunner.js" defer></script>
</head>
<body data-chapter="{chNNN}">
<a class="skip" href="#main">Skip to content</a>
<div class="layout">
  <aside id="sidebar" aria-label="Chapter navigation"></aside>
  <main id="main">
    <div class="content">

      <header class="ch-hero">
        <div class="ch-kicker">Act {ROMAN} · {Act title}</div>
        <h1>{Chapter title — exactly as in nav.json}</h1>
        <p class="ch-tagline">{One-sentence promise of the chapter, may differ from nav tagline}</p>
        <div class="ch-meta"><span>~{minutes} min</span><span>Chapter {N} of 108</span></div>
      </header>

      <!-- body sections here -->

      <div class="ch-done">
        <button class="complete-btn" data-complete>Mark chapter complete</button>
      </div>
      <nav class="ch-nav" data-chnav aria-label="Chapter navigation"></nav>

    </div>
  </main>
</div>
</body>
</html>
```

`data-chapter` MUST equal the chapter id (e.g. `ch061`). The `<h1>` MUST match the
nav.json title. The sidebar and prev/next links are built automatically — never
hand-write them.

## 2. Required structure, in order

1. **Hero** (above).
2. **The story** — the FIRST body section. A concrete real-life scene (an everyday
   situation, a workplace moment, a machine, a kitchen, a bank branch…) that IS the
   concept in disguise. 120–250 words. Markup:
   ```html
   <section class="panel story">
     <div class="story-label">The story</div>
     <p>…</p>
   </section>
   ```
3. **Concept sections** — `<h2>` headings, plain prose, short paragraphs. Build from
   the story to the real thing. Define every technical term on first use with
   `<dfn>term</dfn>` followed by a plain-words definition in the same sentence.
4. **Interactive elements** (see minimums below), placed where they teach best —
   never bunched at the end.
5. **In the wild** (required) — where the reader will meet this concept in real
   codebases, config files, or merge requests:
   ```html
   <div class="callout wild"><span class="co-label">In the wild</span><p>…</p></div>
   ```
6. **Check yourself** (required) — a quiz, ≥3 questions (see markup below).
7. **Key takeaways** (required) — 4–7 bullets:
   ```html
   <section class="takeaways"><h2>Key takeaways</h2><ul><li>…</li></ul></section>
   ```
8. Completion button + `data-chnav` (from the skeleton).

Prose volume: 1,400–2,600 words excluding code. Every chapter must be complete —
no TODO, no placeholders, no "coming soon".

## 3. Interactivity minimums

- The quiz (required, ≥3 questions).
- PLUS at least TWO other interactive components from: walkthrough, stepper,
  pyrun, flipgrid, viz-bars/viz-tiles.
- Chapters that teach Python code MUST include at least one `pyrun` the reader can
  run and modify. Conceptual chapters (models, landscape, GitLab) should prefer
  steppers and flip cards.

### Quiz

```html
<section class="quiz">
  <h2>Check yourself</h2>
  <div class="q" data-answer="b">
    <p class="q-text">1. {Question}?</p>
    <div class="q-opts">
      <button data-opt="a">{option}</button>
      <button data-opt="b">{option}</button>
      <button data-opt="c">{option}</button>
    </div>
    <p class="q-explain">{Why the right answer is right — 1–2 sentences}</p>
  </div>
  <!-- more .q blocks -->
</section>
```
Wrong picks stay clickable so the reader can retry; the explanation shows on success.

### Walkthrough (annotated code, click a line to unfold its meaning)

```html
<div class="walkthrough">
  <div class="wl-head">{filename or short label}</div>
  <div class="wl-line"><code>def greet(name):</code>
    <div class="wl-note">{What this line does, in plain words.}</div></div>
  <div class="wl-line"><code>    return f"Hello, {name}"</code></div>
</div>
```
Lines without a `.wl-note` render as plain code. Annotate the lines that matter
(aim for half or more). Preserve real indentation inside `<code>`. Escape `&` as
`&amp;`, `<` as `&lt;`, `>` as `&gt;` inside all code.

### Stepper (animated step-through diagram)

```html
<div class="stepper">
  <div class="step" data-title="{step name}">
    <h3>{Step heading}</h3>
    <div class="diagram">
      <div class="d-box hot">User<small>asks a question</small></div>
      <span class="d-arrow">&#8594;</span>
      <div class="d-box">LLM<small>thinks</small></div>
      <div class="d-box dim">Tool</div>
    </div>
    <p class="step-cap">{caption explaining this step}</p>
  </div>
  <!-- 3–8 .step blocks -->
</div>
```
Diagram primitives: `.d-box` (add `hot` = highlighted, `good` = success,
`dim` = inactive), `.d-arrow` (use `&#8594;` or `&#8595;`), `.d-col` for stacking.
Across steps, move the `hot` highlight to animate flow. Inline SVG is also allowed
(use `stroke="currentColor"` or the CSS vars for color). GitLab-UI chapters should
use steppers as annotated screen recreations (toolbar boxes, buttons, forms drawn
with d-boxes/SVG) — with the element under discussion marked `hot`.

### Python runner

```html
<div class="pyrun" data-title="{short label}">
<textarea class="py-src" spellcheck="false">
print("hello")
</textarea>
</div>
```
Rules: pure Python 3 stdlib only (no pip installs, no network, no file writes),
finishes in under ~2 seconds, always prints something. Simulate LLM calls with a
small scripted fake (e.g. a `fake_llm()` function returning canned responses) —
that pattern lets real agent loops run fully in the browser. Never include the
literal text `</textarea` inside the code.

### Flip cards (vocabulary)

```html
<div class="flipgrid">
  <button class="flip" type="button">
    <span class="flip-front">{term}</span>
    <span class="flip-back">{plain-words definition}</span>
  </button>
</div>
```

### Stat tiles / comparison bars (only when numbers genuinely help)

```html
<div class="viz-tiles">
  <div class="tile"><div class="tile-label">{label}</div>
    <div class="tile-value">{value}</div><div class="tile-delta">{context}</div></div>
</div>

<div data-bars data-title="{what is being compared}" data-unit="tokens"
     data-note="{one-line reading of the chart}">
  <div class="bar" data-label="ReAct loop" data-value="1000"></div>
  <div class="bar" data-label="Deep agent" data-value="2000"></div>
</div>
```
Never invent precise statistics — use round illustrative numbers and say so, or
well-known public figures.

### Static code blocks

```html
<div class="code-title">{filename}</div>
<pre><code class="language-python">…escaped code…</code></pre>
```
Languages available: `language-python`, `language-yaml`, `language-json`,
`language-bash`, `language-javascript`, `language-markup`, `language-diff`,
`language-toml`, `language-docker`. Always set one.

### Callouts

```html
<div class="callout note"><span class="co-label">Note</span><p>…</p></div>
<div class="callout tip"><span class="co-label">Tip</span><p>…</p></div>
<div class="callout warn"><span class="co-label">Careful</span><p>…</p></div>
<div class="callout wild"><span class="co-label">In the wild</span><p>…</p></div>
```

### Tables

Wrap in `<div class="tbl">…</div>`.

## 4. Voice and pedagogy

- Second person, warm, direct, zero condescension. The reader is a smart
  professional who operates production AI systems — they are new to *syntax*,
  not to *thinking*.
- Analogy first, mechanism second, code third. Every abstraction gets a concrete
  picture before its real name.
- **Recall links**: when a concept from an earlier chapter reappears, link to it
  (`<a href="ch017-decorators.html">decorators</a>`) and give a one-clause
  refresher. Chapters that were promised a recall-opener in their brief must
  start their first concept section with a 3–4 sentence recap of the earlier
  chapter before new material.
- British/Indian English spellings are fine; keep sentences short.
- Humour is welcome; sarcasm about the reader is not.

## 5. Hard rules

- **No emoji anywhere.** No decorative Unicode (arrows `&#8594;` inside diagrams
  are fine).
- No `<img>` tags, no external images, no iframes. Diagrams are HTML/CSS/SVG.
- No external scripts/styles beyond the skeleton's CDNs (fonts, Prism, Pyodide).
- No inline `style=` attributes except trivial width/spacing tweaks.
- No real company-internal names or details: never mention specific internal
  harness projects, colleagues, or employers of the reader. Say "an enterprise
  harness team" / "a large bank". Public products (LangChain, GitLab, Claude
  Code, GPT…) are fine.
- Escape `&`, `<`, `>` in ALL code samples.
- Titles/ids/slugs must match nav.json exactly.

## 6. Technical accuracy (as of mid-2026) — do not teach stale APIs

- LangChain 1.x: `from langchain.agents import create_agent` (NOT the legacy
  `AgentExecutor` / `initialize_agent`); `init_chat_model`; middleware hooks.
  LCEL pipelines exist but are not the way agents are built now.
- LangGraph 1.x: `from langgraph.graph import StateGraph, START, END`;
  `add_node` / `add_edge` / `add_conditional_edges`; `.compile(checkpointer=…)`;
  checkpointers: `InMemorySaver` (langgraph.checkpoint.memory), Postgres/Redis/
  SQLite via `langgraph-checkpoint-*` packages; human-in-the-loop via
  `interrupt()` + `Command(resume=…)`; threads via `config={"configurable":
  {"thread_id": …}}`.
- deepagents: `from deepagents import create_deep_agent`; built-in planning tool
  (`write_todos`), virtual file tools (`ls`, `read_file`, `write_file`,
  `edit_file`), subagents via the `task` tool; backends: StateBackend (default),
  FilesystemBackend, StoreBackend, CompositeBackend (longest-prefix routing,
  e.g. a persistent `/memories/` prefix).
- MCP: Python SDK `from mcp.server.fastmcp import FastMCP`, `@mcp.tool()`;
  transports stdio + streamable HTTP; newer spec additions (tasks, elicitation)
  exist — mention as "newer spec additions", don't deep-dive.
  LangChain adapter: `langchain-mcp-adapters` (`MultiServerMCPClient`).
- Anthropic API: `client.messages.create(model=…, max_tokens=…, messages=[…])`.
  OpenAI API: chat completions / responses API.
- Landscape: Microsoft Agent Framework superseded AutoGen + Semantic Kernel.
  A2A protocol is under the Linux Foundation. Agent Skills = SKILL.md standard.
- Azure / Kubernetes (Act XIII): resource hierarchy is subscription > resource
  group > resource; CLI flow `az login`, `az group create`, `az acr create`,
  `az aks create --resource-group … --name … --node-count …`,
  `az aks get-credentials` (wires kubectl), `az aks update --attach-acr`.
  kubectl verbs: get / describe / logs / exec / apply / rollout / port-forward /
  top / get events. Pod failure states: Pending (no node/resources),
  ImagePullBackOff (registry/image name/auth), CrashLoopBackOff (app exits —
  read logs), OOMKilled (memory limit). Manifests: apps/v1 Deployment (replicas,
  selector.matchLabels must match template.metadata.labels), v1 Service
  (ClusterIP default), ConfigMap, Secret (base64, not encryption — use Key
  Vault / workload identity for real secrets). Probes: liveness vs readiness.
  Scaling: HorizontalPodAutoscaler. Identity: Microsoft Entra workload identity
  (federated) — never bake API keys into images. Agent-in-a-pod wiring: config
  via ConfigMap/env, secrets via Key Vault CSI or workload identity, skills as
  mounted volume or baked into the image, local stdio MCP servers as sidecar
  containers in the same pod, shared/remote MCP servers as separate Services
  reached over streamable HTTP, A2A endpoint exposed via a Service (+ ingress
  for cross-cluster). Teach commands exactly as they are — verify anything
  uncertain against current docs.
- AG-UI (Act XIV) — VERIFIED cheat sheet (mid-2026), teach exactly this:
  - AG-UI = "Agent-User Interaction Protocol", an OPEN, EVENT-BASED protocol made
    by **CopilotKit**. It standardises how an agent BACKEND streams its activity to
    a user-facing FRONTEND, and how the UI sends state/actions back. The trio:
    MCP = agent↔tools, A2A = agent↔agent, **AG-UI = agent↔user/frontend**.
  - It is a PROTOCOL, not an orchestration/runtime engine like LangGraph. It gives
    you the streaming contract between agent and UI; it does NOT give you
    orchestration, checkpointing, durable state, branching, or a control loop —
    you build/own those yourself (or bring a lighter loop). Say this honestly.
  - Wire event `type` values are SCREAMING_SNAKE_CASE. The ~16 standard events:
    Lifecycle: `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`, `STEP_STARTED`, `STEP_FINISHED`.
    Text: `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END`, `TEXT_MESSAGE_CHUNK`.
    Tools: `TOOL_CALL_START`, `TOOL_CALL_ARGS`, `TOOL_CALL_END`, `TOOL_CALL_CHUNK`, `TOOL_CALL_RESULT`.
    State: `STATE_SNAPSHOT`, `STATE_DELTA` (a JSON Patch array, RFC 6902), `MESSAGES_SNAPSHOT`.
    Special: `RAW`, `CUSTOM`. Newer `REASONING_*` events replaced the deprecated
    `THINKING_*` set (removed in 1.0). Base fields on every event: `type`, optional
    `timestamp`, optional `rawEvent`. JSON field names are camelCase on the wire
    (`messageId`, `threadId`, `runId`, `toolCallId`, `toolCallName`, `delta`).
  - Transport: default is **HTTP + SSE** (`Content-Type: text/event-stream`, each
    event serialised as `data: {json}\n\n`); a high-performance HTTP **binary**
    option exists for production; the protocol is transport-agnostic (WebSocket/
    webhooks also possible). The frontend POSTs a `RunAgentInput` (fields: threadId,
    runId, messages, state, tools, context) to the agent endpoint; the backend
    streams back `BaseEvent`s. Reference client is `HttpAgent`.
  - Python SDK: `from ag_ui.core import RunAgentInput, EventType, RunStartedEvent,
    TextMessageStartEvent, TextMessageContentEvent, ...`; `from ag_ui.encoder import
    EventEncoder`; `encoder = EventEncoder(accept=<accept-header>)`;
    `encoder.encode(event)` → the `data: {...}\n\n` SSE string. Typically a FastAPI
    `@app.post("/")` returning `StreamingResponse(gen(), media_type="text/event-stream")`.
    Python event classes take snake_case kwargs (`message_id=`, `thread_id=`) that
    serialise to camelCase JSON.
  - Frontend = **CopilotKit** (React). Provider: `<CopilotKit runtimeUrl={...}
    agent="myAgent">`; prebuilt chat `<CopilotChat />`. Shared/bidirectional state:
    `const { state, setState, running } = useCoAgent({ name: "myAgent",
    initialState: {...} })` — the agent's `STATE_SNAPSHOT`/`STATE_DELTA` updates
    `state`; the UI's `setState()` pushes back into the agent's next turn.
    Generative UI + human-in-the-loop: `useCopilotAction({ name, description,
    parameters, render })` renders a custom React component from an agent tool call;
    use `renderAndWaitForResponse` instead of `render` for HITL — it gives a
    `respond` function in the render props, the component stays mounted until you
    call `respond(value)`, and that value is returned to the agent as the tool result.
  - Framework-agnostic: it can front a raw LLM loop, CrewAI, Mastra, Agno, LangGraph,
    Microsoft Agent Framework, Pydantic AI, LlamaIndex, etc. React code CANNOT run in
    a pyrun (Python only) — show React as static `language-javascript`/`language-jsx`
    code blocks + walkthroughs; use a pyrun to SIMULATE the backend emitting the event
    stream (a generator yielding AG-UI event dicts) or the UI reducer applying events.
  - Verify anything beyond this sheet against docs.ag-ui.com / docs.copilotkit.ai.
- If you are not CERTAIN of an API detail, verify against current docs (context7
  or web search) before writing it, or teach the stable shape and explicitly say
  "check the current docs for the exact name". Never invent method names.

## 7. Before you finish

Run `python3 tools/validate_page.py chapters/{file}` from the `academy/` folder.
Fix every FAIL and re-run until it reports PASS. Warnings should be fixed when
reasonable.
