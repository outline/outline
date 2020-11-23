// @flow
import i18n from "i18next";
import backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

const lng =
  "DEFAULT_LANGUAGE" in process.env ? process.env.DEFAULT_LANGUAGE : "en_US";

const initI18n = () => {
  i18n
    .use(backend)
    .use(initReactI18next)
    .init({
      backend: {
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
};

const languages = ["en_US", "de_DE", "pt_PT"];

export { initI18n, languages, i18n };
