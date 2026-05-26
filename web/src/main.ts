import { Chat } from './chat.js';
import { PromptApi } from './prompt-api.js';

export class Main {
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
			const query = inputEl.value.trim();
			if (query.length === 0) {
				return;
			}
			void Main.handleTurn(query, messagesEl, inputEl, submitEl);
		});
	}

	// Run one user turn: append bubbles, stream the assistant reply, restore input state.
	private static async handleTurn(
		query: string,
		messagesEl: HTMLElement,
		inputEl: HTMLInputElement,
		submitEl: HTMLButtonElement,
	): Promise<void> {
		Main.appendBubble(messagesEl, 'user', query);
		// Start the assistant bubble in an "empty" state until the first chunk arrives.
		const assistantEl = Main.appendBubble(messagesEl, 'assistant', '');
		assistantEl.classList.add('is-empty');

		inputEl.value = '';
		inputEl.disabled = true;
		submitEl.disabled = true;

		try {
			await Chat.ask(query, (chunk) => {
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

	// Create a chat bubble for the given role and append it to the message list.
	private static appendBubble(
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
