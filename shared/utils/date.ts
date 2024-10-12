/* eslint-disable import/no-duplicates */
import {
  Locale,
  addSeconds,
  formatDistanceToNow,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import {
  cs,
  de,
  enUS,
  es,
  faIR,
  fr,
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
  en_US: enUS,
  es_ES: es,
  fa_IR: faIR,
  fr_FR: fr,
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
