import { i18n } from "i18next";
import { locales, unicodeCLDRtoBCP47 } from "@shared/utils/date";
import Desktop from "./Desktop";

/**
 * Formats a number using the user's locale where possible.
 *
 * @param number The number to format
 * @param locale The locale to use for formatting (BCP47 format)
 * @returns The formatted number as a string
 */
export function formatNumber(number: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch (e) {
    return number.toString();
  }
}

/**
 * Detects the user's language based on the browser's language settings.
 *
 * @returns The user's language in CLDR format (en_US)
 */
export function detectLanguage() {
  const [ln, r] = navigator.language.split("-");
  const region = (r || ln).toUpperCase();
  return `${ln}_${region}` as keyof typeof locales;
}

/**
 * Changes the language of the app, and updates the spellchecker language
 * if running in the desktop shell.
 *
 * @param locale The locale to change to, in CLDR format (en_US)
 * @param instance The i18n instance to use
 */
export async function changeLanguage(
  locale: string | null | undefined,
  instance: i18n
) {
  // Languages are stored in en_US format in the database, however the
  // frontend translation framework (i18next) expects en-US
  const localeBCP = locale ? unicodeCLDRtoBCP47(locale) : undefined;

  if (localeBCP && instance.languages?.[0] !== localeBCP) {
    await instance.changeLanguage(localeBCP);
    await Desktop.bridge?.setSpellCheckerLanguages(["en-US", localeBCP]);
  }
}
