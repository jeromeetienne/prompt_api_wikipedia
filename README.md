# On-Device Wikipedia Chat

A serverless AI chatbot grounded in Wikipedia, powered by Chrome's built-in [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) — your questions never leave your browser.

**Live demo:** <https://jeromeetienne.github.io/ondevice_wikipedia_chat/>

## What it does

Each turn runs a small RAG pipeline entirely in the browser:

1. The recent user messages are passed to Chrome's `LanguageDetector` to pick which Wikipedia to query — falls back to `en` if the API is unavailable or confidence is low.
2. Your question is distilled into a concise Wikipedia search query (in the same language) by a short-lived Prompt API session.
3. The Wikipedia [REST search endpoint](https://en.wikipedia.org/w/rest.php/v1/search/page) at `https://{lang}.wikipedia.org/w/rest.php/v1/search/page` returns the top matching articles.
4. Each article's summary is fetched from `https://{lang}.wikipedia.org/api/rest_v1/page/summary/{key}`.
5. A grounded prompt (instructions + delimited article extracts + your question) is streamed through a persistent Prompt API session so the model keeps conversation history.
6. The streamed answer is rendered as Markdown (via `marked`) and sanitized (via `dompurify`) before being injected into the chat bubble.

For a longer walk-through of the design choices behind this pipeline, see [docs/chat-with-wikipedia.article.md](docs/chat-with-wikipedia.article.md).

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

The build uses Vite's `base: './'` so the output works under any subpath, including `/ondevice_wikipedia_chat/` on GitHub Pages.

## Tech stack

- [Vite 5](https://vitejs.dev/) + [TypeScript 5](https://www.typescriptlang.org/) (strict)
- [Bootstrap 5](https://getbootstrap.com/) + [Bootstrap Icons](https://icons.getbootstrap.com/) (via CDN)
- [`marked`](https://marked.js.org/) for Markdown rendering
- [`dompurify`](https://github.com/cure53/DOMPurify) for sanitizing model output
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) (search + summary)
- [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api) (`window.LanguageModel`)
- [Chrome Language Detector API](https://developer.chrome.com/docs/ai/language-detection) (`window.LanguageDetector`) — optional; falls back to English

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
            ├── prompt_helper.ts             # Prompt API session + streaming
            ├── language_detector_helper.ts  # Chrome LanguageDetector wrapper
            └── wikipedia_helper.ts          # Wikipedia REST search + summary
vite.config.ts            # Vite multi-entry build, base './'
```

---

Made with ❤️ by [Jerome Etienne](https://www.linkedin.com/in/jeromeetienne/)
