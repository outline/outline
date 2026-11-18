import { iso6393To1 as iso6393To1Map } from "iso-639-3/iso6393-to-1.js";
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
  "zh", // Chinese
  "ja", // Japanese
  "ko", // Korean
]);

/**
 * Converts an ISO 639-3 language code to ISO 639-1. Individual languages that
 * have no ISO 639-1 code of their own, such as `cmn` (Mandarin), fall back to
 * the code of their macrolanguage, `zho` → `zh`.
 *
 * @param language the language code in ISO 639-3 format.
 * @return the language code in ISO 639-1 format, or undefined.
 */
export function iso6393To1(language: string): string | undefined {
  const macrolanguage = macrolanguages[language];
  return (
    iso6393To1Map[language] ??
    (macrolanguage ? iso6393To1Map[macrolanguage] : undefined)
  );
}

/**
 * Individual languages without an ISO 639-1 code, mapped to their ISO 639-3
 * macrolanguage. Limited to languages that language detection can return.
 */
const macrolanguages: Record<string, string> = {
  als: "sqi", // Tosk Albanian → Albanian
  arb: "ara", // Standard Arabic → Arabic
  ayr: "aym", // Central Aymara → Aymara
  azj: "aze", // North Azerbaijani → Azerbaijani
  ckb: "kur", // Central Kurdish → Kurdish
  cmn: "zho", // Mandarin Chinese → Chinese
  ekk: "est", // Standard Estonian → Estonian
  fuf: "ful", // Pular → Fulah
  fuv: "ful", // Nigerian Fulfulde → Fulah
  khk: "mon", // Halh Mongolian → Mongolian
  knc: "kau", // Central Kanuri → Kanuri
  kng: "kon", // Koongo → Kongo
  koi: "kom", // Komi-Permyak → Komi
  lvs: "lav", // Standard Latvian → Latvian
  min: "msa", // Minangkabau → Malay
  npi: "nep", // Nepali → Nepali
  pbu: "pus", // Northern Pashto → Pashto
  pes: "fas", // Iranian Persian → Persian
  plt: "mlg", // Plateau Malagasy → Malagasy
  prs: "fas", // Dari → Persian
  qug: "que", // Chimborazo Highland Quichua → Quechua
  quy: "que", // Ayacucho Quechua → Quechua
  quz: "que", // Cusco Quechua → Quechua
  src: "srd", // Logudorese Sardinian → Sardinian
  swh: "swa", // Swahili → Swahili
  uzn: "uzb", // Northern Uzbek → Uzbek
  ydd: "yid", // Eastern Yiddish → Yiddish
  zlm: "msa", // Malay → Malay
  zyb: "zha", // Yongbei Zhuang → Zhuang
};
