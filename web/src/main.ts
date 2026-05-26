import { Chat } from './chat.js';
import { PromptApi } from './prompt-api.js';

export class Main {
	static init(): void {
		const banner = document.getElementById('banner') as HTMLDivElement;
		const messages = document.getElementById('messages') as HTMLElement;
		const form = document.getElementById('form') as HTMLFormElement;
		const input = document.getElementById('input') as HTMLInputElement;
		const submit = document.getElementById('submit') as HTMLButtonElement;

		if (PromptApi.isSupported() === false) {
			banner.hidden = false;
			banner.innerHTML =
				'Chrome\'s Prompt API (<code>window.LanguageModel</code>) is not available in this browser. ' +
				'Open this page in Chrome with the Prompt API enabled — see ' +
				'<a href="https://developer.chrome.com/docs/ai/prompt-api" target="_blank" rel="noreferrer">' +
				'developer.chrome.com/docs/ai/prompt-api</a>.';
			input.disabled = true;
			submit.disabled = true;
			return;
		}

		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const query = input.value.trim();
			if (query.length === 0) {
				return;
			}
			void Main.handleTurn(query, messages, input, submit);
		});
	}

	private static async handleTurn(
		query: string,
		messages: HTMLElement,
		input: HTMLInputElement,
		submit: HTMLButtonElement,
	): Promise<void> {
		Main.appendBubble(messages, 'user', query);
		const assistant = Main.appendBubble(messages, 'assistant', '');
		assistant.classList.add('is-empty');

		input.value = '';
		input.disabled = true;
		submit.disabled = true;

		try {
			await Chat.ask(query, (chunk) => {
				if (assistant.classList.contains('is-empty') === true) {
					assistant.classList.remove('is-empty');
				}
				assistant.textContent = (assistant.textContent ?? '') + chunk;
				messages.scrollTop = messages.scrollHeight;
			});
		} catch (err) {
			assistant.classList.remove('is-empty');
			const message = err instanceof Error ? err.message : String(err);
			assistant.textContent = `Error: ${message}`;
		} finally {
			input.disabled = false;
			submit.disabled = false;
			input.focus();
		}
	}

	private static appendBubble(
		messages: HTMLElement,
		role: 'user' | 'assistant',
		text: string,
	): HTMLDivElement {
		const el = document.createElement('div');
		el.className = `bubble bubble--${role}`;
		el.textContent = text;
		messages.appendChild(el);
		messages.scrollTop = messages.scrollHeight;
		return el;
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => Main.init());
} else {
	Main.init();
}
