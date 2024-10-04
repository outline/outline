import i18n from "i18next";
import backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import { languages } from "@shared/i18n";
import { unicodeCLDRtoBCP47, unicodeBCP47toCLDR } from "@shared/utils/date";
import Logger from "./Logger";

/**
 * Initializes i18n library, loading all available translations from the
 * API backend.
 *
 * @param defaultLanguage The default language to use if the user's language
 * is not supported.
 * @returns A promise resolving to the i18n instance
 */
export function initI18n(defaultLanguage = "en_US") {
  const lng = unicodeCLDRtoBCP47(defaultLanguage);

  void i18n
    .use(backend)
    .use(initReactI18next)
    .init({
      compatibilityJSON: "v3",
      backend: {
        // this must match the path defined in routes. It's the path that the
        // frontend UI code will hit to load missing translations.
        loadPath: (locale: string[]) =>
          `/locales/${unicodeBCP47toCLDR(locale[0])}.json`,
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      lng,
      fallbackLng: lng,
      supportedLngs: languages.map(unicodeCLDRtoBCP47),
      keySeparator: false,
      returnNull: false,
    })
    .catch((err) => {
      Logger.error("Failed to initialize i18n", err);
    });

  return i18n;
}
