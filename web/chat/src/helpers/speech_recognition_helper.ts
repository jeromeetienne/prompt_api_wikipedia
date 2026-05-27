type SpeechRecognitionAlternative = {
	transcript: string;
	confidence: number;
};

type SpeechRecognitionResult = {
	readonly isFinal: boolean;
	readonly length: number;
	readonly [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
	readonly length: number;
	readonly [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = {
	readonly resultIndex: number;
	readonly results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = {
	readonly error: string;
	readonly message?: string;
};

type SpeechRecognitionInstance = {
	lang: string;
	interimResults: boolean;
	continuous: boolean;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
	abort(): void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
	// eslint-disable-next-line no-var
	var SpeechRecognition: SpeechRecognitionConstructor | undefined;
	// eslint-disable-next-line no-var
	var webkitSpeechRecognition: SpeechRecognitionConstructor | undefined;
}

type SpeechRecognitionCallbacks = {
	onTranscript: (transcript: string) => void;
	onError?: (error: string) => void;
	onEnd?: () => void;
};

type SpeechRecognitionHelperOptions = {
	lang?: string;
};

export class SpeechRecognitionHelper {
	private recognition: SpeechRecognitionInstance;

	static isSupported(): boolean {
		return typeof globalThis.SpeechRecognition !== 'undefined'
			|| typeof globalThis.webkitSpeechRecognition !== 'undefined';
	}

	constructor(options: SpeechRecognitionHelperOptions = {}) {
		const Ctor = (globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition) as SpeechRecognitionConstructor | undefined;
		if (Ctor === undefined) {
			throw new Error('SpeechRecognition is not available in this browser.');
		}
		this.recognition = new Ctor();
		this.recognition.interimResults = true;
		this.recognition.continuous = false;
		if (options.lang !== undefined) {
			this.recognition.lang = options.lang;
		}
	}

	start(callbacks: SpeechRecognitionCallbacks): void {
		this.recognition.onresult = (event) => {
			let transcript = '';
			for (let i = 0; i < event.results.length; i += 1) {
				const result = event.results[i];
				if (result !== undefined && result.length > 0) {
					transcript += result[0].transcript;
				}
			}
			callbacks.onTranscript(transcript);
		};
		this.recognition.onerror = (event) => {
			if (callbacks.onError !== undefined) {
				callbacks.onError(event.error);
			}
		};
		this.recognition.onend = () => {
			if (callbacks.onEnd !== undefined) {
				callbacks.onEnd();
			}
		};
		this.recognition.start();
	}

	stop(): void {
		this.recognition.stop();
	}

	abort(): void {
		this.recognition.onresult = null;
		this.recognition.abort();
	}
}
