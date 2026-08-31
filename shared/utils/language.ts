import { languages } from "../i18n";
import { unicodeBCP47toCLDR, unicodeCLDRtoBCP47 } from "./date";

/**
 * Formats a number using the specified locale where possible.
 *
 * @param number the number to format.
 * @param locale the locale to use in BCP 47 format.
 * @return the formatted number as a string.
 */
export function formatNumber(number: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch {
    return number.toString();
  }
}

/**
 * Returns the first supported language from BCP 47 or CLDR locale values.
 *
 * @param locales the locale values in priority order.
 * @return the supported language in CLDR format, or undefined.
 */
export function getSupportedLanguage(
  ...locales: unknown[]
): string | undefined {
  for (const locale of locales) {
    if (typeof locale !== "string") {
      continue;
    }

    let canonicalLocale;
    try {
      [canonicalLocale] = Intl.getCanonicalLocales(unicodeCLDRtoBCP47(locale));
    } catch {
      continue;
    }

    const language = unicodeBCP47toCLDR(canonicalLocale);
    const supportedLanguage = languages.find(
      (candidate) => candidate === language
    );
    if (supportedLanguage) {
      return supportedLanguage;
    }
  }

  return undefined;
}

/**
 * Returns the language code if it needs special text styling.
 *
 * @param language the language code to check in ISO 639-1 format.
 * @return the language code if it needs special styling, or undefined.
 */
export function getLangFor(
  language: string | null | undefined
): string | undefined {
  if (!language) {
    return undefined;
  }

  return scriptsWithLang.has(language) ? language : undefined;
}

/**
 * Languages with special styling, in ISO 639-1 format.
 */
const scriptsWithLang = new Set([
  "th", // Thai
  "lo", // Lao
  "km", // Khmer
  "my", // Burmese
  "hi", // Hindi
  "mr", // Marathi
  "ne", // Nepali
  "bn", // Bengali
  "gu", // Gujarati
  "pa", // Punjabi
  "te", // Telugu
  "ta", // Tamil
  "ml", // Malayalam
  "si", // Sinhala
  "bo", // Tibetan
  "ar", // Arabic
  "fa", // Persian
  "ur", // Urdu
  "he", // Hebrew
  "am", // Amharic
  "mn", // Mongolian
]);
