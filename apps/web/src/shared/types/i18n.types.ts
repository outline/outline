export const SUPPORTED_LANGUAGES = {
	ID: "id",
	EN: "en",
	JV: "jv",
	BJN: "bjn",
} as const;

export type TLanguage =
	(typeof SUPPORTED_LANGUAGES)[keyof typeof SUPPORTED_LANGUAGES];

export const DEFAULT_LANGUAGE: TLanguage = SUPPORTED_LANGUAGES.ID;
