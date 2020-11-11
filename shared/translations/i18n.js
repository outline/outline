// @flow
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de_DE from "./de_DE.json";
import en_US from "./default.json";
import pt_PT from "./pt_PT.json";

const outlineTranslation = {
  init: () => {
    i18n.use(initReactI18next).init({
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      lng:
        "DEFAULT_LANGUAGE" in process.env
          ? process.env.DEFAULT_LANGUAGE
          : "en_US",
      debug: process.env.NODE_ENV !== "production",
      resources: {
        en_US: {
          translation: en_US,
        },
        de_DE: {
          translation: de_DE,
        },
        pt_PT: {
          translation: pt_PT,
        },
      },
    });
  },
};

export { outlineTranslation, i18n, en_US, de_DE, pt_PT };
