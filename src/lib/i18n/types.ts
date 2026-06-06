import type en from "./en.json";

type DeepStringify<T> = {
	[K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};

export type TranslationsStructure = DeepStringify<typeof en>;
