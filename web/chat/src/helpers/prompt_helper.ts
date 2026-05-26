type LanguageModelMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

type LanguageModelCreateOptions = {
	initialPrompts?: LanguageModelMessage[];
	temperature?: number;
	topK?: number;
};

type LanguageModelSession = {
	prompt(input: string): Promise<string>;
	promptStreaming(input: string): ReadableStream<string>;
	destroy(): void;
};

type LanguageModelStatic = {
	availability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
	create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
};

declare global {
	// eslint-disable-next-line no-var
	var LanguageModel: LanguageModelStatic | undefined;
}

export class PromptHelper {
	static isSupported(): boolean {
		return typeof globalThis.LanguageModel !== 'undefined';
	}

	static async createSession(systemPrompt: string): Promise<LanguageModelSession> {
		if (PromptHelper.isSupported() === false) {
			throw new Error('Prompt API (LanguageModel) is not available in this browser.');
		}
		const model = globalThis.LanguageModel as LanguageModelStatic;
		return await model.create({
			initialPrompts: [{ role: 'system', content: systemPrompt }],
		});
	}

	static async *streamPrompt(
		session: LanguageModelSession,
		userPrompt: string,
	): AsyncIterable<string> {
		const stream = session.promptStreaming(userPrompt);
		const reader = stream.getReader();
		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done === true) {
					return;
				}
				if (value !== undefined) {
					yield value;
				}
			}
		} finally {
			reader.releaseLock();
		}
	}
}

export type { LanguageModelSession };
