import i18n from "i18next";
import backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

// Note: Updating the available languages? Make sure to also update the
// locales array in app/utils/i18n.js to enable translation for timestamps.
export const languageOptions = [
  {
    label: "English (US)",
    value: "en_US",
  },
  {
    label: "简体中文 (Chinese, Simplified)",
    value: "zh_CN",
  },
  {
    label: "繁體中文 (Chinese, Traditional)",
    value: "zh_TW",
  },
  {
    label: "Deutsch (Deutschland)",
    value: "de_DE",
  },
  {
    label: "Español (España)",
    value: "es_ES",
  },
  {
    label: "فارسی (Persian)",
    value: "fa_IR",
  },
  {
    label: "Français (France)",
    value: "fr_FR",
  },
  {
    label: "Italiano (Italia)",
    value: "it_IT",
  },
  {
    label: "日本語 (Japanese)",
    value: "ja_JP",
  },
  {
    label: "한국어 (Korean)",
    value: "ko_KR",
  },
  {
    label: "Português (Brazil)",
    value: "pt_BR",
  },
  {
    label: "Português (Portugal)",
    value: "pt_PT",
  },
  {
    label: "Pусский (Россия)",
    value: "ru_RU",
  },
  {
    label: "Polskie (Polska)",
    value: "pl_PL",
  },
  {
    label: "Tiếng Việt (Vietnamese)",
    value: "vi_VN",
  },
  {
    label: "Türkçe (Turkish)",
    value: "tr_TR",
  },
];

export const languages: string[] = languageOptions.map((i) => i.value);

// Languages are stored in en_US format in the database, however the
// frontend translation framework (i18next) expects en-US
const underscoreToDash = (text: string) => text.replace("_", "-");

const dashToUnderscore = (text: string) => text.replace("-", "_");

export const initI18n = (defaultLanguage = "en_US") => {
  const lng = underscoreToDash(defaultLanguage);
  i18n
    .use(backend)
    .use(initReactI18next)
    .init({
      compatibilityJSON: "v3",
      backend: {
        // this must match the path defined in routes. It's the path that the
        // frontend UI code will hit to load missing translations.
        loadPath: (languages: string[]) =>
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
      keySeparator: false,
    });
  return i18n;
};
