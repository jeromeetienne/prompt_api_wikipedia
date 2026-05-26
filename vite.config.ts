import { defineConfig } from 'vite';

const fromHere = (relativePath: string): string =>
	new URL(relativePath, import.meta.url).pathname;

export default defineConfig({
	root: 'web',
	base: './',
	build: {
		outDir: '../dist',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				main: fromHere('./web/index.html'),
				chat: fromHere('./web/chat/index.html'),
			},
		},
	},
	server: {
		port: 5173,
	},
});
