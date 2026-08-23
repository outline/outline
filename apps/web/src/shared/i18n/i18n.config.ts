import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "../types/i18n.types";
import bjn from "./locales/bjn.json";
import en from "./locales/en.json";
import id from "./locales/id.json";
import jv from "./locales/jv.json";

export const resources = {
	[SUPPORTED_LANGUAGES.ID]: { translation: id },
	[SUPPORTED_LANGUAGES.EN]: { translation: en },
	[SUPPORTED_LANGUAGES.JV]: { translation: jv },
	[SUPPORTED_LANGUAGES.BJN]: { translation: bjn },
} as const;

i18n.use(initReactI18next).init({
	resources,
	lng: DEFAULT_LANGUAGE,
	fallbackLng: DEFAULT_LANGUAGE,
	supportedLngs: Object.values(SUPPORTED_LANGUAGES),
	interpolation: {
		escapeValue: false,
	},
});

export { i18n };
