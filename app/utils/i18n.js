// @flow
import {
  enUS,
  de,
  faIR,
  fr,
  es,
  it,
  ja,
  ko,
  ptBR,
  pt,
  zhCN,
  zhTW,
  ru,
  pl,
} from "date-fns/locale";

const locales = {
  en_US: enUS,
  de_DE: de,
  es_ES: es,
  fa_IR: faIR,
  fr_FR: fr,
  it_IT: it,
  ja_JP: ja,
  ko_KR: ko,
  pt_BR: ptBR,
  pt_PT: pt,
  zh_CN: zhCN,
  zh_TW: zhTW,
  ru_RU: ru,
  pl_PL: pl,
};

export function dateLocale(userLocale: ?string) {
  return userLocale ? locales[userLocale] : undefined;
}
