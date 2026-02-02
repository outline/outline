import type { i18n } from "i18next";
import type { locales } from "@shared/utils/date";
import { unicodeCLDRtoBCP47, unicodeBCP47toCLDR } from "@shared/utils/date";
import Desktop from "./Desktop";

/**
 * Formats a number using the user's locale where possible. Use `useFormatNumber` hook
 * instead of this function in React components, to automatically use the user's locale.
 *
 * @param number The number to format
 * @param locale The locale to use for formatting (BCP47 format)
 * @returns The formatted number as a string
 */
export function formatNumber(number: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch (_err) {
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

  if (!localeBCP) {
    return;
  }

  // Remove existing resources to force reload
  if (instance.hasResourceBundle(localeBCP, "translation")) {
    instance.removeResourceBundle(localeBCP, "translation");
  }

  // Change language and wait for translations to load
  // This will trigger React components to re-render via useTranslation hook
  try {
    // Remove existing resources to force reload
    if (instance.hasResourceBundle(localeBCP, "translation")) {
      instance.removeResourceBundle(localeBCP, "translation");
    }

    // Change language first - this triggers backend to load translations
    await instance.changeLanguage(localeBCP);

    // Force reload translations from backend immediately
    // This ensures fresh translations are loaded, especially after language change
    await instance.reloadResources([localeBCP], "translation");

    // Ensure translations are loaded - wait for backend to fetch them
    await instance.loadNamespaces("translation");

    // Verify that translations were actually loaded
    if (!instance.hasResourceBundle(localeBCP, "translation")) {
      console.warn(
        `Failed to load translations for ${localeBCP}. Trying to load manually...`
      );
      // Try to load translations manually via backend
      const localeCLDR = unicodeBCP47toCLDR(localeBCP);
      try {
        const response = await fetch(`/locales/${localeCLDR}.json`, {
          cache: "no-store", // Prevent caching
        });
        if (response.ok) {
          const translations = await response.json();
          instance.addResourceBundle(localeBCP, "translation", translations, true, true);
          // Force React to re-render with new translations
          instance.emit("languageChanged", localeBCP);
        }
      } catch (fetchError) {
        console.error(`Failed to fetch translations for ${localeBCP}:`, fetchError);
      }
    } else {
      // Force React to re-render with new translations
      instance.emit("languageChanged", localeBCP);
    }
  } catch (error) {
    console.error(`Error changing language to ${localeBCP}:`, error);
  }

  await Desktop.bridge?.setSpellCheckerLanguages(["en-US", localeBCP]);
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

/**
 * Returns the language code if it requires special text styling, otherwise undefined.
 * This is used to determine if a lang attribute should be set on elements for CSS styling.
 *
 * @param langCode The language code to check, in ISO 639-1 format
 * @returns The language code if it requires special styling, otherwise undefined
 */
export function getLangFor(
  langCode: string | null | undefined
): string | undefined {
  if (!langCode) {
    return undefined;
  }
  return scriptsWithLang.has(langCode) ? langCode : undefined;
}
