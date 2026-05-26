# Chat with Wikipedia

On-device chat grounded in Wikipedia, powered by Chrome's built-in [Prompt API](https://developer.chrome.com/docs/ai/prompt-api). The language model runs locally in your browser — no server round-trip.

**Live demo:** <https://jeromeetienne.github.io/prompt_api_wikipedia/>

## What it does

Each turn runs a small RAG pipeline entirely in the browser:

1. Your question is distilled into a concise Wikipedia search query by a short-lived Prompt API session.
2. The Wikipedia [REST search endpoint](https://en.wikipedia.org/w/rest.php/v1/search/page) returns the top matching articles.
3. Each article's summary is fetched from `https://en.wikipedia.org/api/rest_v1/page/summary/{key}`.
4. A grounded prompt (instructions + delimited article extracts + your question) is streamed through a persistent Prompt API session so the model keeps conversation history.
5. The streamed answer is rendered as Markdown (via `marked`) and sanitized (via `dompurify`) before being injected into the chat bubble.

## Requirements

You need **Chrome with the Prompt API enabled**. If `window.LanguageModel` is unavailable, the app shows an in-page banner and the input is disabled. See <https://developer.chrome.com/docs/ai/prompt-api> for setup.

## Local development

```sh
npm install
npm run dev
```

Open <http://localhost:5173>. The home page is at `/`, the chat at `/chat/`.

## Build & deploy

```sh
npm run build    # tsc + vite build, output to dist/
npm run deploy   # publishes dist/ to gh-pages (predeploy runs build)
```

The build uses Vite's `base: './'` so the output works under any subpath, including `/prompt_api_wikipedia/` on GitHub Pages.

## Tech stack

- [Vite 5](https://vitejs.dev/) + [TypeScript 5](https://www.typescriptlang.org/) (strict)
- [Bootstrap 5](https://getbootstrap.com/) + [Bootstrap Icons](https://icons.getbootstrap.com/) (via CDN)
- [`marked`](https://marked.js.org/) for Markdown rendering
- [`dompurify`](https://github.com/cure53/DOMPurify) for sanitizing model output
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) (search + summary)
- [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api) (`window.LanguageModel`)

## Project layout

```
web/
├── index.html            # landing page
└── chat/
    ├── index.html        # chat UI
    └── src/
        ├── main.ts       # entry — wires DOM, runs the per-turn pipeline
        ├── types.ts      # shared shapes
        └── helpers/
            ├── prompt_helper.ts     # Prompt API session + streaming
            └── wikipedia_helper.ts  # Wikipedia REST search + summary
vite.config.ts            # Vite multi-entry build, base './'
```

---

Made with ❤️ by [Jerome Etienne](https://www.linkedin.com/in/jeromeetienne/)
