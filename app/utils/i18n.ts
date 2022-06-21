import {
  de,
  enUS,
  es,
  faIR,
  fr,
  it,
  ja,
  ko,
  ptBR,
  pt,
  pl,
  ru,
  tr,
  vi,
  zhCN,
  zhTW,
} from "date-fns/locale";

const locales = {
  de_DE: de,
  en_US: enUS,
  es_ES: es,
  fa_IR: faIR,
  fr_FR: fr,
  it_IT: it,
  ja_JP: ja,
  ko_KR: ko,
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

export { locales };
