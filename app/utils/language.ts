import { i18n } from "i18next";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";
import Desktop from "./Desktop";

export function detectLanguage() {
  const [ln, r] = navigator.language.split("-");
  const region = (r || ln).toUpperCase();
  return `${ln}_${region}`;
}

export function changeLanguage(
  toLanguageString: string | null | undefined,
  i18n: i18n
) {
  const locale = toLanguageString
    ? unicodeCLDRtoBCP47(toLanguageString)
    : undefined;

  if (locale && i18n.languages?.[0] !== locale) {
    // Languages are stored in en_US format in the database, however the
    // frontend translation framework (i18next) expects en-US
    i18n.changeLanguage(locale);
    Desktop.bridge?.setSpellCheckerLanguages(["en-US", locale]);
  }
}
