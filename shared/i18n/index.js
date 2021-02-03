// @flow
import i18n from "i18next";
import backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

// Note: Updating the available languages? Make sure to also update the
// locales array in app/components/LocaleTime.js to enable translation for timestamps.
export const languageOptions = [
  { label: "English (US)", value: "en_US" },
  { label: "简体中文 (Chinese, Simplified)", value: "zh_CN" },
  { label: "Deutsch (Deutschland)", value: "de_DE" },
  { label: "Español (España)", value: "es_ES" },
  { label: "Français (France)", value: "fr_FR" },
  { label: "Italiano (Italia)", value: "it_IT" },
  { label: "한국어 (Korean)", value: "ko_KR" },
  { label: "Português (Portugal)", value: "pt_PT" },
];

export const languages: string[] = languageOptions.map((i) => i.value);

// Languages are stored in en_US format in the database, however the
// frontend translation framework (i18next) expects en-US
const underscoreToDash = (text: string) => text.replace("_", "-");
const dashToUnderscore = (text: string) => text.replace("-", "_");

export const initI18n = () => {
  const lng = underscoreToDash(
    "DEFAULT_LANGUAGE" in process.env ? process.env.DEFAULT_LANGUAGE : "en_US"
  );

  i18n
    .use(backend)
    .use(initReactI18next)
    .init({
      backend: {
        // this must match the path defined in routes. It's the path that the
        // frontend UI code will hit to load missing translations.
        loadPath: (languages: string[], namespaces: string[]) =>
          `/locales/${dashToUnderscore(languages[0])}.json`,
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      lng,
      fallbackLng: lng,
      supportedLngs: languages.map(underscoreToDash),
      // Uncomment when debugging translation framework, otherwise it's noisy
      // debug: process.env.NODE_ENV === "development",
      keySeparator: false,
    });

  return i18n;
};
