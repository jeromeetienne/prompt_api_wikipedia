type LanguageModelMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
};

type LanguageModelAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

type DownloadProgressEvent = {
	loaded: number;
};

type CreateMonitor = {
	addEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void;
};

type LanguageModelCreateOptions = {
	initialPrompts?: LanguageModelMessage[];
	temperature?: number;
	topK?: number;
	monitor?: (m: CreateMonitor) => void;
};

type LanguageModelSession = {
	prompt(input: string): Promise<string>;
	promptStreaming(input: string): ReadableStream<string>;
	destroy(): void;
};

type LanguageModelStatic = {
	availability(): Promise<LanguageModelAvailability>;
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

	static async availability(): Promise<LanguageModelAvailability> {
		if (PromptHelper.isSupported() === false) {
			return 'unavailable';
		}
		const model = globalThis.LanguageModel as LanguageModelStatic;
		return await model.availability();
	}

	static async createSession(
		options: LanguageModelCreateOptions,
		onDownloadProgress?: (loaded: number) => void,
	): Promise<LanguageModelSession> {
		if (PromptHelper.isSupported() === false) {
			throw new Error('Prompt API (LanguageModel) is not available in this browser.');
		}
		const model = globalThis.LanguageModel as LanguageModelStatic;
		const createOptions: LanguageModelCreateOptions = { ...options };
		if (onDownloadProgress !== undefined) {
			createOptions.monitor = (m) => {
				m.addEventListener('downloadprogress', (event) => {
					onDownloadProgress(event.loaded);
				});
			};
		}
		return await model.create(createOptions);
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

export type { LanguageModelMessage, LanguageModelSession, LanguageModelAvailability };
