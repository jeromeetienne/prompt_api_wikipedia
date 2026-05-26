import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { PromptHelper, type LanguageModelSession } from './helpers/prompt_helper.js';
import { WikipediaHelper } from './helpers/wikipedia_helper.js';
import type { WikipediaArticle } from './types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////


const MAIN_SYSTEM_PROMPT =
	'You are a helpful assistant that answers questions strictly from the provided Wikipedia article. ' +
	'If the article does not contain the answer, say so plainly.';

const QUERY_SYSTEM_PROMPT =
	'You convert a user question into a concise Wikipedia search query. ' +
	'Respond with only the query — no quotes, no punctuation, no explanation. ' +
	'Keep it under 10 words and focus on the main entity or topic.';

const SEARCH_RESULT_LIMIT = 3;


///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Entry point for the Wikipedia chat demo. Wires up the DOM, mediates
 * between the user input form and the streaming answer pipeline.
 */
export class Main {
	private static chatSession: LanguageModelSession | null = null;

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
		if (PromptHelper.isSupported() === false) {
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
			void Main.processUserInput(userInput, messagesEl, inputEl, submitEl);
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
	private static async processUserInput(
		userInput: string,
		messagesEl: HTMLElement,
		inputEl: HTMLInputElement,
		submitEl: HTMLButtonElement,
	): Promise<void> {
		Main.appendBubbleUi(messagesEl, 'user', userInput);
		// Start the assistant bubble in an "empty" state until the first chunk arrives.
		const assistantEl = Main.appendBubbleUi(messagesEl, 'assistant', '');
		const spinnerEl = document.createElement('div');
		spinnerEl.className = 'spinner-border spinner-border-sm text-secondary';
		spinnerEl.setAttribute('role', 'status');
		assistantEl.appendChild(spinnerEl);
		assistantEl.dataset.state = 'pending';

		inputEl.value = '';
		inputEl.disabled = true;
		submitEl.disabled = true;

		if (Main.chatSession === null) {
			Main.chatSession = await PromptHelper.createSession(MAIN_SYSTEM_PROMPT);
		}

		let accumulated = '';
		try {
			await Main.queryWikipedia(
				userInput,
				Main.chatSession,
				(statusText) => {
					Main.insertStatusBubbleUi(messagesEl, assistantEl, statusText);
					messagesEl.scrollTop = messagesEl.scrollHeight;
				},
				(chunk) => {
					if (assistantEl.dataset.state === 'pending') {
						delete assistantEl.dataset.state;
					}
					accumulated += chunk;
					const rendered = marked.parse(accumulated.trimEnd(), { async: false }) as string;
					assistantEl.innerHTML = DOMPurify.sanitize(rendered);
					messagesEl.scrollTop = messagesEl.scrollHeight;
				},
			);
		} catch (err) {
			delete assistantEl.dataset.state;
			const message = err instanceof Error ? err.message : String(err);
			assistantEl.textContent = `Error: ${message}`;
		} finally {
			inputEl.disabled = false;
			submitEl.disabled = false;
			inputEl.focus();
		}
	}

	/**
	 * Two-stage pipeline: first asks the Prompt API to distill the user's
	 * question into a concise Wikipedia search query, then looks up the top
	 * matching article and streams a grounded answer. Emits a fallback
	 * message via `onChunk` when no article matches.
	 *
	 * @param userInput  - The user's raw question. Used to derive the search
	 *                     query and also passed verbatim to the answering model.
	 * @param onChunk    - Invoked for each streamed text fragment, plus a
	 *                     leading status hint with the generated search query.
	 */
	private static async queryWikipedia(
		userInput: string,
		session: LanguageModelSession,
		onStatus: (text: string) => void,
		onChunk: (text: string) => void,
	): Promise<void> {
		const searchQuery = await Main.generateSearchQuery(userInput);
		console.log(`Generated search query: "${searchQuery}"`);
		onStatus(`Searching Wikipedia for: "${searchQuery}"`);

		const searchResults = await WikipediaHelper.search(searchQuery, SEARCH_RESULT_LIMIT);
		if (searchResults.length === 0) {
			onChunk('No matching Wikipedia article was found for that question.');
			return;
		}
		console.log('Search results:', searchResults);
		const articles = await Promise.all(
			searchResults.map((searchResult) => WikipediaHelper.getSummary(searchResult.key)),
		);
		const userPrompt = Main.buildPrompt(articles, userInput);
		console.log('Constructed user prompt:', userPrompt);
		for await (const chunk of PromptHelper.streamPrompt(session, userPrompt)) {
			onChunk(chunk);
		}
	}

	/**
	 * Opens a short-lived Prompt API session to convert the user's natural
	 * language question into a concise Wikipedia search query.
	 *
	 * @param userInput  - The user's raw question.
	 * @returns The distilled query, or `userInput` if the model returns nothing.
	 */
	private static async generateSearchQuery(userInput: string): Promise<string> {
		const session = await PromptHelper.createSession(QUERY_SYSTEM_PROMPT);
		try {
			let output = '';
			for await (const chunk of PromptHelper.streamPrompt(session, userInput)) {
				output += chunk;
			}
			const trimmed = output.trim();
			if (trimmed.length === 0) {
				return userInput;
			}
			return trimmed;
		} finally {
			session.destroy();
		}
	}

	/**
	 * Assembles the grounded user prompt: instructions, one delimited
	 * Wikipedia extract per article as context, and the question.
	 *
	 * @param articles - Wikipedia articles the model must rely on.
	 * @param query    - Original user question.
	 * @returns The fully formatted prompt string to send to the model.
	 */
	private static buildPrompt(articles: WikipediaArticle[], query: string): string {
		const articleBlocks = articles.flatMap((article) => [
			`--- Wikipedia: ${article.title} ---`,
			article.summary,
			'---',
			'',
		]);
		return [
			'Answer the user\'s question using only the Wikipedia content below.',
			'If the content does not contain the answer, say so.',
			'',
			...articleBlocks,
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
		const baseClasses = 'px-3 py-2 shadow-sm rounded-4 lh-base';
		if (role === 'user') {
			bubbleEl.className = `${baseClasses} align-self-end bg-primary text-white`;
			bubbleEl.style.setProperty('border-bottom-right-radius', '0', 'important');
			bubbleEl.style.whiteSpace = 'pre-wrap';
		} else {
			bubbleEl.className = `${baseClasses} align-self-start bg-body-tertiary border markdown-bubble`;
			bubbleEl.style.setProperty('border-bottom-left-radius', '0', 'important');
		}
		bubbleEl.style.maxWidth = '85%';
		bubbleEl.style.wordWrap = 'break-word';
		bubbleEl.textContent = text;
		messagesEl.appendChild(bubbleEl);
		messagesEl.scrollTop = messagesEl.scrollHeight;
		return bubbleEl;
	}

	/**
	 * Creates a centered, grayed pill bubble representing an intermediary
	 * step (e.g. the Wikipedia search query that was generated) and inserts
	 * it just before the given reference element.
	 *
	 * @param messagesEl  - Container that holds the chat bubbles.
	 * @param beforeEl    - Existing element the status bubble is inserted before.
	 * @param text        - Status text to display.
	 * @returns The created status bubble element.
	 */
	private static insertStatusBubbleUi(
		messagesEl: HTMLElement,
		beforeEl: HTMLElement,
		text: string,
	): HTMLDivElement {
		const bubbleEl = document.createElement('div');
		bubbleEl.className = 'align-self-center bg-body-secondary text-secondary small fst-italic rounded-pill px-3 py-1';
		bubbleEl.textContent = text;
		messagesEl.insertBefore(bubbleEl, beforeEl);
		return bubbleEl;
	}
}

// Boot Main.init once the DOM is parsed.
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => Main.init());
} else {
	Main.init();
}
