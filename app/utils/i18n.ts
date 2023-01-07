import {
  de,
  enUS,
  es,
  faIR,
  fr,
  it,
  ja,
  ko,
  nl,
  ptBR,
  pt,
  pl,
  ru,
  tr,
  vi,
  zhCN,
  zhTW,
} from "date-fns/locale";
import i18n from "i18next";
import backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import { languages } from "@shared/i18n";
import { unicodeCLDRtoBCP47, unicodeBCP47toCLDR } from "@shared/utils/date";

const locales = {
  de_DE: de,
  en_US: enUS,
  es_ES: es,
  fa_IR: faIR,
  fr_FR: fr,
  it_IT: it,
  ja_JP: ja,
  ko_KR: ko,
  nl_NL: nl,
  pt_BR: ptBR,
  pt_PT: pt,
  pl_PL: pl,
  ru_RU: ru,
  tr_TR: tr,
  vi_VN: vi,
  zh_CN: zhCN,
  zh_TW: zhTW,
};

export function dateLocale(userLocale: string | null | undefined) {
  return userLocale ? locales[userLocale] : undefined;
}

export function initI18n(defaultLanguage = "en_US") {
  const lng = unicodeCLDRtoBCP47(defaultLanguage);
  i18n
    .use(backend)
    .use(initReactI18next)
    .init({
      compatibilityJSON: "v3",
      backend: {
        // this must match the path defined in routes. It's the path that the
        // frontend UI code will hit to load missing translations.
        loadPath: (languages: string[]) =>
          `/locales/${unicodeBCP47toCLDR(languages[0])}.json`,
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
    });
  return i18n;
}

export { locales };
