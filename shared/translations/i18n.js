// @flow
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de_DE from "./de_DE.json";
import en_US from "./default.json";

i18n.use(initReactI18next).init({
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  lng: process.env.DEFAULT_LANGUAGE,
  debug: process.env.NODE_ENV !== "production",
  resources: {
    en_US: {
      translation: en_US,
    },
    de_DE: {
      translation: de_DE,
    },
  },
});

const t = i18n.getFixedT();

export { t, i18n };
