// @flow
import i18n from "i18next";
import backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

export const initI18n = () => {
  const lng =
    "DEFAULT_LANGUAGE" in process.env ? process.env.DEFAULT_LANGUAGE : "en_US";

  i18n
    .use(backend)
    .use(initReactI18next)
    .init({
      backend: {
        // this must match the path defined in routes. It's the path that the
        // frontend UI code will hit to load missing translations.
        loadPath: "/locales/{{lng}}.json",
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      lng,
      fallbackLng: lng,
      debug: process.env.NODE_ENV !== "production",
      keySeparator: false,
    });

  return i18n;
};

export const languageOptions = [
  { label: "English (US)", value: "en_US" },
  { label: "Deutsch (Deutschland)", value: "de_DE" },
  { label: "Español (España)", value: "es_ES" },
  { label: "Français (France)", value: "fr_FR" },
  { label: "한국어 (Korean)", value: "ko_KR" },
  { label: "Português (Portugal)", value: "pt_PT" },
];

export const languages: string[] = languageOptions.map((i) => i.value);
