type LanguageDetectorResult = {
	detectedLanguage: string;
	confidence: number;
};

type LanguageDetectorInstance = {
	detect(text: string): Promise<LanguageDetectorResult[]>;
};

type LanguageDetectorStatic = {
	availability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
	create(options?: unknown): Promise<LanguageDetectorInstance>;
};

declare global {
	// eslint-disable-next-line no-var
	var LanguageDetector: LanguageDetectorStatic | undefined;
}

export class LanguageDetectorHelper {
	private static detectorPromise: Promise<LanguageDetectorInstance> | null = null;

	static isSupported(): boolean {
		return typeof globalThis.LanguageDetector !== 'undefined';
	}

	/**
	 * Detects the language of `text` and returns its ISO 639-1 code (e.g. "en",
	 * "fr") when the top result clears `minConfidence`. Returns `null` when the
	 * API is unavailable, the text is empty, no result is returned, or the top
	 * confidence is too low to trust — callers should fall back to a default.
	 */
	static async detectTopLanguage(text: string, minConfidence = 0.5): Promise<string | null> {
		if (LanguageDetectorHelper.isSupported() === false) {
			return null;
		}
		if (text.trim().length === 0) {
			return null;
		}
		try {
			const detector = await LanguageDetectorHelper.getDetector();
			const results = await detector.detect(text);
			const top = results[0];
			if (top === undefined || top.confidence < minConfidence) {
				return null;
			}
			if (top.detectedLanguage === 'und') {
				return null;
			}
			return top.detectedLanguage;
		} catch (err) {
			console.warn('Language detection failed:', err);
			return null;
		}
	}

	private static getDetector(): Promise<LanguageDetectorInstance> {
		if (LanguageDetectorHelper.detectorPromise === null) {
			const model = globalThis.LanguageDetector as LanguageDetectorStatic;
			const promise = model.create();
			promise.catch(() => {
				if (LanguageDetectorHelper.detectorPromise === promise) {
					LanguageDetectorHelper.detectorPromise = null;
				}
			});
			LanguageDetectorHelper.detectorPromise = promise;
		}
		return LanguageDetectorHelper.detectorPromise;
	}
}

export type { LanguageDetectorResult };
