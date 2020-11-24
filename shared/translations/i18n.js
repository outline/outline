// @flow
import i18n from "i18next";
import Backend from "i18next-chained-backend";
import HttpApi from "i18next-http-backend";
import LocalStorageBackend from "i18next-localstorage-backend";
import { initReactI18next } from "react-i18next";

const initI18n = () => {
  const lng =
    "DEFAULT_LANGUAGE" in process.env ? process.env.DEFAULT_LANGUAGE : "en_US";

  i18n
    .use(Backend)
    .use(initReactI18next)
    .init({
      backend:
        process.env.NODE_ENV === "test"
          ? {}
          : {
              backends: [LocalStorageBackend, HttpApi],
              backendOptions: [
                {
                  prefix: "translations-",
                  expirationTime: 7 * 24 * 60 * 60 * 1000,
                },
                {
                  loadPath: "/locales/{{lng}}.json",
                },
              ],
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

const languages = ["en_US", "de_DE", "pt_PT"];

export { initI18n, languages, i18n };
