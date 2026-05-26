---
marp: true
paginate: true
html: true
footer: 'github.com/jeromeetienne/prompt_api_wikipedia'
---

<style>
/* @theme cwk */
@import 'default';

:root {
  --bg: #0b1220;
  --bg2: #0f172a;
  --accent: #38bdf8;
  --title: #f8fafc;
  --body: #cbd5e1;
  --muted: #94a3b8;
}

section {
  width: 1080px;
  height: 1350px;
  padding: 96px 80px 132px 80px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background:
    radial-gradient(900px 600px at 18% 22%, rgba(56, 189, 248, 0.10), transparent 70%),
    linear-gradient(135deg, var(--bg) 0%, var(--bg2) 100%);
  color: var(--body);
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

section .eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--accent);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 36px;
}

section .eyebrow::before {
  content: '';
  width: 14px;
  height: 14px;
  background: var(--accent);
  transform: rotate(45deg);
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.55);
  flex-shrink: 0;
}

section h1 {
  font-size: 64px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--title);
  margin: 0 0 32px 0;
  letter-spacing: -0.01em;
}

section h2 {
  font-size: 34px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--body);
  margin: 0 0 24px 0;
}

section p {
  font-size: 32px;
  line-height: 1.5;
  color: var(--body);
  margin: 0 0 24px 0;
}

section ul, section ol {
  font-size: 32px;
  line-height: 1.45;
  color: var(--body);
  padding-left: 32px;
  margin: 0;
}

section li {
  margin: 16px 0;
}

section li::marker {
  color: var(--accent);
}

section strong {
  color: var(--title);
  font-weight: 600;
}

section em {
  color: var(--title);
  font-style: italic;
}

section code {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.9em;
  color: #e2e8f0;
  background: rgba(56, 189, 248, 0.14);
  padding: 2px 10px;
  border-radius: 6px;
}

section footer {
  position: absolute;
  left: 80px;
  right: 80px;
  bottom: 56px;
  color: var(--muted);
  font-size: 20px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  padding-top: 18px;
  border-top: 1px solid rgba(56, 189, 248, 0.30);
  background: transparent;
  text-align: left;
}

section::after {
  color: var(--muted);
  font-size: 20px;
  right: 80px;
  bottom: 56px;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}

section.title {
  justify-content: center;
  padding-bottom: 132px;
}

section.title h1 {
  font-size: 84px;
  font-weight: 800;
  line-height: 1.06;
  margin-bottom: 40px;
}

section.title h2 {
  font-size: 36px;
  font-weight: 400;
  color: var(--body);
}

section.title .eyebrow {
  margin-bottom: 44px;
}

section.cta {
  justify-content: center;
}

section.cta h1 {
  font-size: 64px;
  line-height: 1.12;
}

section.cta h2 {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 30px;
  color: var(--accent);
  margin-top: 32px;
  font-weight: 500;
}
</style>

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: 'Jerome Etienne' -->

<div class="eyebrow">How-to · Chrome Prompt API</div>

# A Wikipedia chatbot that runs entirely in your browser

## A full RAG pipeline in ~300 lines of TypeScript. No backend.

---

<div class="eyebrow">Context</div>

# The browser quietly became an inference target

- Chrome ships `window.LanguageModel`
- An on-device LLM, callable from a `<script>` tag
- No API key. No fetch. No bill.
- Inference moves to the client.

---

<div class="eyebrow">Why it matters</div>

# On-device inference changes the economics

- No per-token cost
- No telemetry by default
- No *"we're sorry, the model is overloaded"* page
- The browser is now a deploy target for LLMs

---

<div class="eyebrow">Problem</div>

# Tiny local models forget facts

Great at language. Terrible at trivia.

They produce plausible nonsense with extreme confidence — wrong dates, wrong people, wrong acquisitions.

---

<div class="eyebrow">Insight · RAG</div>

# Make the model read, not remember

- Fetch authoritative text at query time
- Stuff it into the prompt
- The model becomes a reading-comprehension engine
- A job it's actually good at

---

<div class="eyebrow">Insight · Corpus</div>

# Why Wikipedia is a near-perfect demo corpus

- Huge, broad, human-curated, current
- Clean public REST API
- No keys, no quotas, no scraping
- No licensing acrobatics for a zero-backend project

---

<div class="eyebrow">Insight · Pipeline</div>

# A full RAG loop in 5 steps

1. User asks a question
2. Disposable session distills it into a search query
3. Wikipedia returns the top 3 article keys
4. Each summary is fetched in parallel
5. Persistent session streams a grounded answer

---

<div class="eyebrow">Insight · The trick</div>

# Two sessions, two jobs

- **Disposable** — rewrites the query, no history, destroyed after one use
- **Persistent** — carries the conversation, resolves *"where did she work?"*
- Same model. Very different roles.

---

<div class="eyebrow">Tradeoff · Context</div>

# Use the summary, not the full article

On-device context is tight. A 50k-token article doesn't help — it makes the model slower and loses the user's question.

Wikipedia editors already wrote the lead paragraph for you.

---

<div class="eyebrow">Insight · Security</div>

# Model output is untrusted input

- Stream → `marked` → `DOMPurify` → DOM
- A model can emit `<img src=x onerror=…>` by accident
- Two lines of code stop a Markdown chat from getting XSSed by itself

---

<div class="eyebrow">Apply</div>

# The shape generalizes

- Swap Wikipedia for product docs → in-browser docs assistant
- Swap for a public API → distributable domain chatbot, static site
- Swap for IndexedDB notes → private journal that never phones home

---

<!-- _class: cta -->
<!-- _paginate: false -->
<!-- _footer: 'Jerome Etienne · jeromeetienne.github.io/prompt_api_wikipedia' -->

<div class="eyebrow">Next step</div>

# Clone it. Point Chrome at it. Ask it something it doesn't know.

## github.com/jeromeetienne/prompt_api_wikipedia
