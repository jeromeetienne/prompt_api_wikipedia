# Social posts — A Wikipedia chatbot that runs entirely in your browser

## Twitter / X (max 280 chars)

Chrome shipped an on-device LLM at `window.LanguageModel`. Built a Wikipedia chatbot with it — full RAG, no backend, ~300 lines of TS. Two sessions per turn: one disposable to rewrite the query, one persistent to stream the answer. github.com/jeromeetienne/prompt_api_wikipedia

---

## Bluesky (max 300 chars)

Chrome shipped an on-device LLM at `window.LanguageModel`. Built a Wikipedia chatbot with it: full RAG, no backend, no API key, ~300 lines of TS. Two sessions per turn — one disposable to rewrite the query, one persistent to stream the answer.

github.com/jeromeetienne/prompt_api_wikipedia

---

## LinkedIn (800–1500 chars, multi-paragraph)

Chrome quietly shipped an on-device LLM, callable from a `<script>` tag as `window.LanguageModel`. No API key, no network round-trip for inference, no usage bill. It deserves a small demo.

So I built one — Chat with Wikipedia, a retrieval-augmented chatbot that runs entirely in the browser. ~300 lines of TypeScript, a Vite config, two HTML pages. No backend.

A few details worth pulling out:

• Two Prompt API sessions per user turn — one disposable session rewrites the question into a clean search query, one persistent session carries the conversation and streams the grounded answer. Same model, very different roles.
• The corpus is Wikipedia's public REST API. The summary endpoint returns only the lead paragraph — counter-intuitively better than stuffing whole articles into a tight on-device context window.
• DOMPurify wraps the streamed Markdown before it touches the DOM. A model's output is user-controllable text and deserves the same sanitization any other untrusted input gets.
• Vite's `base: './'` keeps every asset path relative, so the built `dist/` works at GitHub Pages, a subfolder, or unzipped onto a random file server.

The interesting thing about on-device inference isn't that it's free, although it is. It's that it changes which apps are feasible to ship without a server attached.

If you've been waiting for an excuse to look at the Prompt API end-to-end, this is a small one.

→ github.com/jeromeetienne/prompt_api_wikipedia

#WebDev #AI #TypeScript #Chrome #LLM
