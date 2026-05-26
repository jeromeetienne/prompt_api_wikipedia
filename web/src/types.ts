export type WikipediaSearchResult = {
	key: string;
	title: string;
	description: string | null;
};

export type WikipediaArticle = {
	title: string;
	extract: string;
	url: string;
};
