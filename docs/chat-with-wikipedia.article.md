# A Wikipedia chatbot that runs entirely in your browser

Somewhere between the noise of a thousand "AI-powered" product launches, the
browser quietly grew a language model. Not a wrapper, not an API key behind a
proxy — an actual on-device LLM, accessible from JavaScript as
`window.LanguageModel`. Chrome ships it. You can call it from a `<script>` tag.
No fetch, no token, no bill.

That's a fairly large shift, and it deserves small, sharp demos that show what
becomes possible when inference moves to the client. [Chat with
Wikipedia](https://github.com/jeromeetienne/prompt_api_wikipedia) is one of
those demos. It is a complete retrieval-augmented chatbot, grounded in real
encyclopedia content, that runs without a backend. The whole thing fits in a
few hundred lines of TypeScript and a Vite config.

It's a tiny project. That's the point.

## The browser quietly became an inference target

For most of the LLM era so far, "use an LLM in your app" has meant: open an
account, get a key, route every keystroke through someone's server, watch the
metered bill tick upward, and pray your users don't mind their questions
leaving the device.

The [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api) breaks
that model. The model lives on the user's machine. The browser hands you a
`session` object; you give it text; it streams back tokens. There's no network
hop for the inference itself, no per-token cost, no telemetry by default, and
no "we're sorry, the model is overloaded" page.

The flip side is real: it's Chrome-only today, the model is small, and the
feature is still being stabilized. But the architectural implication is
already interesting — the browser is now a place where you can deploy a
language model the same way you deploy a stylesheet.

So what do you build first?

## The grounding problem nobody asked for, that everyone has

A small, on-device model is great for many things and terrible for one in
particular: knowing facts. It hasn't read the morning news. It can be hazy on
who currently holds an office, which company acquired which startup, or what
year a battle was fought. Asking a tiny local model trivia is asking for
plausible nonsense delivered with extreme confidence.

The standard fix is retrieval-augmented generation (RAG). Instead of expecting
the model to *remember* the answer, you fetch authoritative text at query
time, stuff it into the prompt, and ask the model to answer using only that
text. The model stops being a knowledge base and starts being a reading
comprehension engine — which is a job it's actually good at.

This is exactly the thing the Prompt API needs to be useful in practice. And
it's the thing this repository builds.

## Why Wikipedia is a near-perfect retrieval corpus for a demo

If you're going to ground an LLM in something, Wikipedia is hard to beat. It's
huge, broad, kept current by an actual human community, and — crucially for a
zero-backend project — it exposes a clean public REST API. No keys, no quotas
you'll trip during a demo, no scraping, no licensing acrobatics.

The repo leans on two endpoints:

- A [search endpoint](https://en.wikipedia.org/w/rest.php/v1/search/page) that
  returns the top matching article titles for a query.
- A [summary endpoint](https://en.wikipedia.org/api/rest_v1/page/summary/) that
  returns the lead paragraph of a given article.

The summary, not the full article, is the bit that gets handed to the model.
That's a deliberate choice — more on that in a moment.

## A whole RAG pipeline in 300 lines

Conceptually, every user turn runs through a five-step loop, all of it in the
browser:

1. The user asks a question in plain English.
2. A short-lived Prompt API session distills that question into a concise
   Wikipedia search query.
3. The Wikipedia search endpoint returns the top three article keys.
4. Each article's summary is fetched in parallel.
5. A second, persistent Prompt API session is given a grounded prompt
   (instructions + delimited extracts + the original question) and streams the
   answer back, which is rendered as Markdown and sanitized before it touches
   the DOM.

That's it. Two `helpers/` files, one `main.ts`, a couple of HTML pages, and a
Vite config. The whole pipeline lives in [main.ts](web/chat/src/main.ts), and
it's short enough to read in one sitting.

A few of the design decisions are quietly interesting.

## The trick: two sessions, two jobs

The repository uses two Prompt API sessions per turn, and they have very
different lifetimes and personalities.

The first session is **short-lived and disposable**. Its only job is to
convert "where did Ada Lovelace grow up?" into something like
`Ada Lovelace biography` — a clean keyword query suitable for Wikipedia's
search endpoint. The system prompt is strict ("respond with only the query —
no quotes, no punctuation, no explanation"), the session is created, used
once, and destroyed.

The second session is **persistent across turns**. It carries the conversation
history, so follow-up questions like "where did she work?" still resolve to
"she" correctly. It's created once and reused.

This is a small example of a pattern that's becoming load-bearing in
LLM-powered apps: use the model as a router or transformer for one role, and
as a conversational partner for another. Same underlying model, very different
ergonomics. The Prompt API's `session.destroy()` makes this explicit — you
get to choose when memory persists and when it's thrown away.

## Why the summary, not the full article

A natural instinct is "stuff the whole article into the prompt, more context
is better." It isn't. On-device models run with a tight context window, and
Wikipedia articles can be enormous. A 50k-token article doesn't make the
answer more correct; it makes the model slower, sometimes refuses to answer at
all, and tends to lose the user's actual question in the middle of all that
text.

The summary endpoint returns the lead paragraph — the part editors have
already curated to be the densest, most directly answerable text about the
subject. For a "what is X" or "who is X" style chatbot, this is often
*literally* the part you'd quote anyway. It's a nice example of letting the
data source do retrieval ranking for you instead of brute-forcing context.

Fetching three of these summaries in parallel and concatenating them with
clear delimiters gives the model both breadth (if the search picked the wrong
article first, the right one is probably in the next two) and a structured
prompt format that nudges it to cite the relevant block.

## Streaming, Markdown, and not getting XSSed by your own model

The answer is rendered incrementally as it streams in. Each chunk is appended
to an accumulator, the accumulator is parsed by [`marked`](https://marked.js.org/),
and the resulting HTML is run through
[DOMPurify](https://github.com/cure53/DOMPurify) before being injected into
the chat bubble.

That last step matters more than it looks. A language model's output is
untrusted input. If the model produces something like
`<img src=x onerror=alert(1)>` — whether by accident, by hallucinating
example code, or because someone fed it a prompt designed to make it do that —
you really do not want to set that as `innerHTML` raw. DOMPurify is the
seatbelt. It's two lines of code and it's the difference between "a Markdown
chat UI" and "a Markdown chat UI that can't get owned by a clever question."

This is a discipline that LLM frontends will increasingly need to internalize:
the model's stream is user-controllable text, and it deserves the same
sanitization you'd give any other user input.

## The boring infrastructure that makes it portable

A surprising amount of the polish in this project is in two small choices that
have nothing to do with AI.

First, the Vite config sets `base: './'`. That means the built site uses
relative paths for every asset, which in turn means the same `dist/` directory
works at `https://example.com/`, at
`https://jeromeetienne.github.io/prompt_api_wikipedia/`, or unzipped to a
random subfolder on a file server. You don't have to know the deployment URL
at build time. For a demo whose entire point is "go try it," that's a small
gift to anyone who wants to fork it.

Second, the app is two HTML entry points (a landing page and a chat page),
wired together through Vite's multi-entry rollup config. That keeps the chat
behind a click — useful, because the Prompt API can prompt the user to
download the model the first time, and you'd rather have that moment happen
when they've explicitly opted in.

Neither of these is exotic. They're the kind of detail you only put in when
you've actually tried to ship a small web project and felt the friction.

## What this is, and what it isn't

It is a demo. The model is small, the corpus is curated to summaries, the
search is keyword-based and will occasionally pick the wrong article, and the
whole thing only runs in a recent version of Chrome with the Prompt API
turned on. If the API isn't available, the app does the right thing — it
shows an in-page banner and disables the input — but it doesn't try to fall
back to a hosted model. That's a feature, not a missing piece: the entire
appeal is that there is no fallback path that leaks your conversation to
someone else's server.

It is also a glimpse. If you squint, the architecture generalizes to almost
any "ask questions about X" experience:

- Swap Wikipedia for your own product docs and you have an in-browser docs
  assistant with no inference bill.
- Swap it for a public API (movies, recipes, scientific abstracts, code
  search) and you have a domain chatbot that's distributable as a static site.
- Swap it for an IndexedDB store of personal notes and you have a private
  journal assistant that genuinely never phones home.

The repository doesn't try to be any of those things. It picks one tractable
demo, executes it cleanly, and leaves the generalization as an exercise.

## The shape of what's coming

The interesting part of on-device inference isn't that it's free, although it
is. It's that it changes which apps are *feasible*. An app that costs nothing
per query and shares nothing about the user can be deployed differently,
priced differently, and scoped differently than one that doesn't. A grad
student can ship a useful chatbot on GitHub Pages and forget about it. A
company can build internal tools without an LLM line item. A privacy-sensitive
product can promise something stronger than "we don't log" — namely "we
literally can't see it."

Most of the implications are still being worked out. The Prompt API will
evolve, other browsers will catch up or diverge, models will get bigger and
smarter inside the runtime, the cross-browser story will get clearer. But the
shape is already visible, and small projects like this one are how you start
to feel it.

## Worth a read

The whole repository is small enough to read in under an hour, and it's a
useful way to load the Prompt API into your head end-to-end —
[session creation](web/chat/src/helpers/prompt_helper.ts), streaming,
destruction, system prompts, and the practical glue of getting Markdown
safely onto the page. If you've been waiting for an excuse to look at on-device
LLMs in the browser, this is a good one.

Clone it, point Chrome at it, and ask it something it doesn't know.

→ [github.com/jeromeetienne/prompt_api_wikipedia](https://github.com/jeromeetienne/prompt_api_wikipedia)
→ [Live demo](https://jeromeetienne.github.io/prompt_api_wikipedia/)
