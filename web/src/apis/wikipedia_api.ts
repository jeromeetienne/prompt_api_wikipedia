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

export class WikipediaApi {
	static async search(query: string, limit = 3): Promise<WikipediaSearchResult[]> {
		const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=${limit}`;
		const res = await fetch(url);
		if (res.ok === false) {
			throw new Error(`Wikipedia search failed: ${res.status}`);
		}
		const data = (await res.json()) as SearchResponse;
		return data.pages.map((p) => ({
			key: p.key,
			title: p.title,
			description: p.description,
		}));
	}

	static async getSummary(key: string): Promise<WikipediaArticle> {
		const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`;
		const res = await fetch(url);
		if (res.ok === false) {
			throw new Error(`Wikipedia summary failed: ${res.status}`);
		}
		const data = (await res.json()) as SummaryResponse;
		return {
			title: data.title,
			extract: data.extract,
			url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(key)}`,
		};
	}
}
