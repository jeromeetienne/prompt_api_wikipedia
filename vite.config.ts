import { defineConfig } from 'vite';

export default defineConfig({
	root: 'web',
	base: '/prompt_api_wikipedia/',
	build: {
		outDir: '../dist',
		emptyOutDir: true,
	},
	server: {
		port: 5173,
	},
});
