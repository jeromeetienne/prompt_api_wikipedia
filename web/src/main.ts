import { PromptApi } from './apis/prompt_api.js';
import { WikipediaApi } from './apis/wikipedia_api.js';

const SYSTEM_PROMPT =
	'You are a helpful assistant that answers questions strictly from the provided Wikipedia article. If the article does not contain the answer, say so plainly.';

/**
 * Entry point for the Wikipedia chat demo. Wires up the DOM, mediates
 * between the user input form and the streaming answer pipeline.
 */
export class Main {
	/**
	 * Bootstraps the chat UI: caches DOM references, gates on Prompt API
	 * availability, and binds the form submit handler.
	 */
	static init(): void {
		// Cache DOM references used by init and event handlers.
		const bannerEl = document.getElementById('banner') as HTMLDivElement;
		const messagesEl = document.getElementById('messages') as HTMLElement;
		const formEl = document.getElementById('form') as HTMLFormElement;
		const inputEl = document.getElementById('input') as HTMLInputElement;
		const submitEl = document.getElementById('submit') as HTMLButtonElement;

		// Bail out with an in-page banner when the Prompt API is unavailable.
		if (PromptApi.isSupported() === false) {
			bannerEl.hidden = false;
			bannerEl.innerHTML =
				'Chrome\'s Prompt API (<code>window.LanguageModel</code>) is not available in this browser. ' +
				'Open this page in Chrome with the Prompt API enabled — see ' +
				'<a href="https://developer.chrome.com/docs/ai/prompt-api" target="_blank" rel="noreferrer">' +
				'developer.chrome.com/docs/ai/prompt-api</a>.';
			inputEl.disabled = true;
			submitEl.disabled = true;
			return;
		}

		// Wire the chat form: submit a turn, then stream the answer.
		formEl.addEventListener('submit', (event) => {
			event.preventDefault();
			const userInput = inputEl.value.trim();
			if (userInput.length === 0) {
				return;
			}
			void Main.handleTurn(userInput, messagesEl, inputEl, submitEl);
		});
	}

	/**
	 * Runs a single user turn end to end: appends the user bubble, streams
	 * the assistant reply into a fresh bubble, and restores input state when
	 * the turn settles (success or error).
	 *
	 * @param userInput   - Raw text the user submitted.
	 * @param messagesEl  - Container that holds the chat bubbles.
	 * @param inputEl     - Text input, disabled during the turn.
	 * @param submitEl    - Submit button, disabled during the turn.
	 */
	private static async handleTurn(
		userInput: string,
		messagesEl: HTMLElement,
		inputEl: HTMLInputElement,
		submitEl: HTMLButtonElement,
	): Promise<void> {
		Main.appendBubbleUi(messagesEl, 'user', userInput);
		// Start the assistant bubble in an "empty" state until the first chunk arrives.
		const assistantEl = Main.appendBubbleUi(messagesEl, 'assistant', '');
		assistantEl.classList.add('is-empty');

		inputEl.value = '';
		inputEl.disabled = true;
		submitEl.disabled = true;

		try {
			await Main.ask(userInput, (chunk) => {
				if (assistantEl.classList.contains('is-empty') === true) {
					assistantEl.classList.remove('is-empty');
				}
				assistantEl.textContent = (assistantEl.textContent ?? '') + chunk;
				messagesEl.scrollTop = messagesEl.scrollHeight;
			});
		} catch (err) {
			assistantEl.classList.remove('is-empty');
			const message = err instanceof Error ? err.message : String(err);
			assistantEl.textContent = `Error: ${message}`;
		} finally {
			inputEl.disabled = false;
			submitEl.disabled = false;
			inputEl.focus();
		}
	}

	/**
	 * Looks up the top Wikipedia search result for the query and streams a
	 * grounded answer from the on-device Prompt API. Emits a fallback
	 * message via `onChunk` when no article matches.
	 *
	 * @param query    - The user's question, used as both the search query
	 *                   and the question shown to the model.
	 * @param onChunk  - Invoked for each streamed text fragment (or once with
	 *                   the fallback string when no article is found).
	 */
	private static async ask(query: string, onChunk: (text: string) => void): Promise<void> {
		const searchResults = await WikipediaApi.search(query, 1);
		if (searchResults.length === 0) {
			onChunk('No matching Wikipedia article was found for that question.');
			return;
		}

		const article = await WikipediaApi.getSummary(searchResults[0].key);
		const userPrompt = Main.buildPrompt(article.title, article.extract, query);

		const session = await PromptApi.createSession(SYSTEM_PROMPT);
		try {
			for await (const chunk of PromptApi.streamPrompt(session, userPrompt)) {
				onChunk(chunk);
			}
		} finally {
			session.destroy();
		}
	}

	/**
	 * Assembles the grounded user prompt: instructions, the Wikipedia
	 * extract delimited as context, and the question.
	 *
	 * @param title    - Article title, shown in the delimiter for context.
	 * @param extract  - Plain-text article body the model must rely on.
	 * @param query    - Original user question.
	 * @returns The fully formatted prompt string to send to the model.
	 */
	private static buildPrompt(title: string, extract: string, query: string): string {
		return [
			'Answer the user\'s question using only the Wikipedia content below.',
			'If the content does not contain the answer, say so.',
			'',
			`--- Wikipedia: ${title} ---`,
			extract,
			'---',
			'',
			`Question: ${query}`,
		].join('\n');
	}

	/**
	 * Creates a chat bubble for the given role, appends it to the message
	 * list, and scrolls the container to the bottom.
	 *
	 * @param messagesEl  - Container the bubble is appended to.
	 * @param role        - Speaker role; drives the bubble styling.
	 * @param text        - Initial bubble text (may be empty for streaming).
	 * @returns The created bubble element so the caller can mutate it later.
	 */
	private static appendBubbleUi(
		messagesEl: HTMLElement,
		role: 'user' | 'assistant',
		text: string,
	): HTMLDivElement {
		const bubbleEl = document.createElement('div');
		bubbleEl.className = `bubble bubble--${role}`;
		bubbleEl.textContent = text;
		messagesEl.appendChild(bubbleEl);
		messagesEl.scrollTop = messagesEl.scrollHeight;
		return bubbleEl;
	}
}

// Boot Main.init once the DOM is parsed.
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => Main.init());
} else {
	Main.init();
}
