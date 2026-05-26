import type { WikipediaArticle, WikipediaSearchResult } from '../types.js';

type SearchResponse = {
	pages: Array<{
		key: string;
		title: string;
		description: string | null;
	}>;
};

type SummaryResponse = {
	title: string;
	extract: string;
	content_urls?: {
		desktop?: { page?: string };
	};
};

export class WikipediaHelper {
	/**
	 * Search Wikipedia for articles matching the given query.
	 * @param query - The search query string
	 * @param limit - Maximum number of results to return (default: 3)
	 * @returns Promise resolving to an array of Wikipedia search results
	 * @throws Error if the Wikipedia search API request fails
	 */
	static async search(query: string, limit = 3): Promise<WikipediaSearchResult[]> {
		const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=${limit}`;
		const response = await fetch(url);
		if (response.ok === false) {
			throw new Error(`Wikipedia search failed: ${response.status}`);
		}
		const searchResponse = (await response.json()) as SearchResponse;
		return searchResponse.pages.map((p) => ({
			key: p.key,
			title: p.title,
			description: p.description,
		}));
	}

	/**
	 * Get the summary of a Wikipedia article.
	 * @param key - The Wikipedia page key/identifier
	 * @returns Promise resolving to a Wikipedia article with title, extract, and URL
	 * @throws Error if the Wikipedia summary API request fails
	 */
	static async getSummary(key: string): Promise<WikipediaArticle> {
		const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`;
		const response = await fetch(url);
		if (response.ok === false) {
			throw new Error(`Wikipedia summary failed: ${response.status}`);
		}
		const summaryResponse = (await response.json()) as SummaryResponse;
		return {
			title: summaryResponse.title,
			summary: summaryResponse.extract,
			url: summaryResponse.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(key)}`,
		};
	}
}
