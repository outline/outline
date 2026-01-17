/* oxlint-disable import/no-duplicates */
import type { Locale } from "date-fns";
import {
  addSeconds,
  formatDistanceToNow,
  subDays,
  subMonths,
  subWeeks,
  subYears,
  isValid,
  parse,
} from "date-fns";
import {
  cs,
  de,
  enGB,
  enUS,
  es,
  faIR,
  fr,
  hu,
  it,
  ja,
  ko,
  nb,
  nl,
  ptBR,
  pt,
  pl,
  sv,
  tr,
  vi,
  uk,
  zhCN,
  zhTW,
} from "date-fns/locale";
import type { DateFilter } from "../types";
import { isBrowser } from "./browser";

/**
 * Determines if the user's locale uses month-first date format (MM/dd).
 *
 * @returns true if locale uses MM/dd format, false for dd/MM format.
 */
export function usesMonthFirstFormat(): boolean {
  if (!isBrowser || typeof Intl === "undefined") {
    return false;
  }

  // Format a known date and check if month comes before day
  const formatted = new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(2000, 11, 25)); // Dec 25, 2000

  // If it starts with "12", month comes first
  return formatted.startsWith("12");
}

/**
 * Attempts to parse a date string in various common formats.
 *
 * @param dateStr The date string to parse.
 * @returns a Date object if parsing is successful, null otherwise.
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) {
    return null;
  }

  // Remove any trailing alphabetic text (e.g., "Uhr", "at", "o'clock", etc.)
  const cleaned = dateStr.trim().replace(/\s*[a-zA-Z]+\s*$/, "");

  const monthFirst = [
    "MM/dd/yyyy HH:mm:ss",
    "MM/dd/yyyy HH:mm",
    "MM/dd/yyyy",
    "MM/dd HH:mm:ss",
    "MM/dd HH:mm",
    "MM/dd",
  ];

  const dayFirst = [
    "dd/MM/yyyy HH:mm:ss",
    "dd/MM/yyyy HH:mm",
    "dd/MM/yyyy",
    "dd/MM HH:mm:ss",
    "dd/MM HH:mm",
    "dd/MM",
  ];

  // Ambiguous slash formats - order based on user's locale
  const slashFormats = usesMonthFirstFormat()
    ? [...monthFirst, ...dayFirst]
    : [...dayFirst, ...monthFirst];

  // Common date formats used in tables (with and without time, with and without year)
  const formats = [
    // ISO formats
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd HH:mm",
    "yyyy-MM-dd",
    // European dot formats
    "dd.MM.yyyy HH:mm:ss",
    "dd.MM.yyyy HH:mm",
    "dd.MM.yyyy",
    "dd.MM. HH:mm:ss",
    "dd.MM. HH:mm",
    "dd.MM.",
    "d.M.yyyy HH:mm:ss",
    "d.M.yyyy HH:mm",
    "d.M.yyyy",
    "d.M. HH:mm:ss",
    "d.M. HH:mm",
    "d.M.",
    // Locale-dependent slash formats
    ...slashFormats,
  ];

  const referenceDate = new Date();

  for (const format of formats) {
    const date = parse(cleaned, format, referenceDate);
    if (isValid(date)) {
      return date;
    }
  }

  return null;
}

export function subtractDate(date: Date, period: DateFilter) {
  switch (period) {
    case "day":
      return subDays(date, 1);

    case "week":
      return subWeeks(date, 1);

    case "month":
      return subMonths(date, 1);

    case "year":
      return subYears(date, 1);

    default:
      return date;
  }
}

/**
 * Returns a humanized relative time string for the given date.
 *
 * @param date The date to convert
 * @param options The options to pass to date-fns
 * @returns The relative time string
 */
export function dateToRelative(
  date: Date | number,
  options?: {
    includeSeconds?: boolean;
    addSuffix?: boolean;
    locale?: Locale | undefined;
    shorten?: boolean;
  }
) {
  const now = new Date();
  const parsedDateTime = new Date(date);

  // Protect against "in less than a minute" when users computer clock is off.
  const normalizedDateTime =
    parsedDateTime > now && parsedDateTime < addSeconds(now, 60)
      ? now
      : parsedDateTime;

  const output = formatDistanceToNow(normalizedDateTime, options);

  // Some tweaks to make english language shorter.
  if (options?.shorten) {
    return output
      .replace("about", "")
      .replace("less than a minute ago", "just now")
      .replace("minute", "min");
  }

  return output;
}

/**
 * Converts a locale string from Unicode CLDR format to BCP47 format.
 *
 * @param locale The locale string to convert
 * @returns The converted locale string
 */
export function unicodeCLDRtoBCP47(locale: string) {
  return locale.replace("_", "-").replace("root", "und");
}

/**
 * Converts a locale string from BCP47 format to Unicode CLDR format.
 *
 * @param locale The locale string to convert
 * @returns The converted locale string
 */
export function unicodeBCP47toCLDR(locale: string) {
  return locale.replace("-", "_").replace("und", "root");
}

/**
 * Converts a locale string from Unicode CLDR format to ISO 639 format.
 *
 * @param locale The locale string to convert
 * @returns The converted locale string
 */
export function unicodeCLDRtoISO639(locale: string) {
  return locale.split("_")[0];
}

/**
 * Returns the current date as a string formatted depending on current locale.
 *
 * @returns The current date
 */
export function getCurrentDateAsString(locale?: Intl.LocalesArgument) {
  return new Date().toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Returns the current time as a string formatted depending on current locale.
 *
 * @returns The current time
 */
export function getCurrentTimeAsString(locale?: Intl.LocalesArgument) {
  return new Date().toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "numeric",
  });
}

/**
 * Returns the current date and time as a string formatted depending on current
 * locale.
 *
 * @returns The current date and time
 */
export function getCurrentDateTimeAsString(locale?: Intl.LocalesArgument) {
  return new Date().toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}

const locales = {
  cs_CZ: cs,
  de_DE: de,
  en_GB: enGB,
  en_US: enUS,
  es_ES: es,
  fa_IR: faIR,
  fr_FR: fr,
  hu_HU: hu,
  it_IT: it,
  ja_JP: ja,
  ko_KR: ko,
  nb_NO: nb,
  nl_NL: nl,
  pt_BR: ptBR,
  pt_PT: pt,
  pl_PL: pl,
  sv_SE: sv,
  tr_TR: tr,
  uk_UA: uk,
  vi_VN: vi,
  zh_CN: zhCN,
  zh_TW: zhTW,
};

/**
 * Returns the date-fns locale object for the given user language preference.
 *
 * @param language The user language
 * @returns The date-fns locale.
 */
export function dateLocale(language: keyof typeof locales | undefined | null) {
  return language ? locales[language] : undefined;
}

export { locales };
