import { PromptApi } from './prompt-api.js';
import { Wikipedia } from './wikipedia.js';

const SYSTEM_PROMPT =
	'You are a helpful assistant that answers questions strictly from the provided Wikipedia article. If the article does not contain the answer, say so plainly.';

export class Chat {
	static async ask(query: string, onChunk: (text: string) => void): Promise<void> {
		const hits = await Wikipedia.search(query, 1);
		if (hits.length === 0) {
			onChunk('No matching Wikipedia article was found for that question.');
			return;
		}

		const article = await Wikipedia.getSummary(hits[0].key);
		const userPrompt = Chat.buildPrompt(article.title, article.extract, query);

		const session = await PromptApi.createSession(SYSTEM_PROMPT);
		try {
			for await (const chunk of PromptApi.streamPrompt(session, userPrompt)) {
				onChunk(chunk);
			}
		} finally {
			session.destroy();
		}
	}

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
}
