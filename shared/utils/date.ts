/* oxlint-disable import/no-duplicates */
import type { Locale } from "date-fns";
import {
  addSeconds,
  format,
  formatDistanceToNow,
  isSameYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  subDays,
  subMonths,
  subWeeks,
  subYears,
  isValid,
  parse,
} from "date-fns";
// Locales are imported from their individual modules rather than the
// "date-fns/locale" index, which would load every locale date-fns ships
// (~90) into memory rather than only those supported by the app.
import { ca } from "date-fns/locale/ca";
import { cs } from "date-fns/locale/cs";
import { da } from "date-fns/locale/da";
import { de } from "date-fns/locale/de";
import { enGB } from "date-fns/locale/en-GB";
import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";
import { faIR } from "date-fns/locale/fa-IR";
import { fr } from "date-fns/locale/fr";
import { he } from "date-fns/locale/he";
import { hu } from "date-fns/locale/hu";
import { id } from "date-fns/locale/id";
import { it } from "date-fns/locale/it";
import { ja } from "date-fns/locale/ja";
import { ko } from "date-fns/locale/ko";
import { nb } from "date-fns/locale/nb";
import { nl } from "date-fns/locale/nl";
import { ptBR } from "date-fns/locale/pt-BR";
import { pt } from "date-fns/locale/pt";
import { pl } from "date-fns/locale/pl";
import { sv } from "date-fns/locale/sv";
import { tr } from "date-fns/locale/tr";
import { vi } from "date-fns/locale/vi";
import { uk } from "date-fns/locale/uk";
import { zhCN } from "date-fns/locale/zh-CN";
import { zhTW } from "date-fns/locale/zh-TW";
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

const ISO8601_DURATION_RE =
  /^-?P(?:(\d+W)|((?:\d+Y)?(?:\d+M)?(?:\d+D)?)(T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?)$/;

/**
 * Validate a string against the ISO 8601 duration format.
 *
 * Supported subset: an optional leading `-`, then `P[nY][nM][nW][nD][T[nH][nM][nS]]`.
 * The weeks form (`PnW`) is mutually exclusive with year/month/day units.
 * Decimals are not supported.
 *
 * @param value the candidate string.
 * @returns true if the string is a syntactically valid ISO 8601 duration.
 */
export function isISO8601Duration(value: string): boolean {
  const m = ISO8601_DURATION_RE.exec(value);
  if (!m) {
    return false;
  }
  const [, weeks, date, time] = m;
  if (weeks) {
    return true;
  }
  // A bare `T` separator with no following time unit is invalid even if a date
  // portion is present (e.g. `P1DT` should be rejected).
  if (time === "T") {
    return false;
  }
  const hasDate = !!date && date.length > 0;
  const hasTime = !!time && time.length > 1;
  return hasDate || hasTime;
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
  ca_ES: ca,
  cs_CZ: cs,
  da_DK: da,
  de_DE: de,
  en_GB: enGB,
  en_US: enUS,
  es_ES: es,
  fa_IR: faIR,
  fr_FR: fr,
  he_IL: he,
  hu_HU: hu,
  id_ID: id,
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

/**
 * Formats a Date into a date-only ISO string (yyyy-MM-dd) in the local
 * timezone. Used as the stored value for date mentions.
 *
 * @param date The date to format.
 * @returns the date-only ISO string.
 */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Formats a Date into a date and time ISO string (yyyy-MM-dd'T'HH:mm) in the
 * local timezone. Used as the stored value for time-specific date mentions.
 *
 * @param date The date to format.
 * @returns the date and time ISO string.
 */
export function toISODateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Whether a date mention's stored ISO value carries a time component.
 *
 * @param iso The stored ISO string.
 * @returns true when the value is time-specific.
 */
export function hasTimeComponent(iso: string): boolean {
  return isoDateTimeRegex.test(iso);
}

/**
 * Parses a date mention's stored ISO string into a Date in the local timezone.
 * Accepts both the date-only (yyyy-MM-dd) and time-specific
 * (yyyy-MM-dd'T'HH:mm) forms, the former resolving to local midnight. Any other
 * shape – including values carrying seconds or a timezone offset – is rejected
 * so the local, minute-granular contract cannot be violated.
 *
 * @param iso The stored ISO string.
 * @returns the parsed Date, or null when the string is not a valid value.
 */
export function parseISODate(iso: string): Date | null {
  if (!isoDateRegex.test(iso) && !isoDateTimeRegex.test(iso)) {
    return null;
  }
  const date = parseISO(iso);
  return isValid(date) ? date : null;
}

const separators = new Map<string, string>();

/**
 * Returns the separator a locale places between the date and time halves of a
 * formatted datetime, e.g. " at " in English or " um " in German. It is read
 * from the platform's own formatter so the label needs no translation.
 */
function dateTimeSeparator(language?: keyof typeof locales | null): string {
  // Without a language the date and time halves fall back to date-fns' English
  // locale, so the separator must be English too rather than the platform's.
  const tag = language ? language.replace("_", "-") : "en-US";

  let separator = separators.get(tag);
  if (separator !== undefined) {
    return separator;
  }

  separator = " ";

  if (typeof Intl !== "undefined") {
    const sample = new Date(2000, 11, 25, 13, 0);
    const parts = new Intl.DateTimeFormat(tag, {
      dateStyle: "long",
      timeStyle: "short",
    }).formatToParts(sample);

    const timeIndex = parts.findIndex((part) =>
      ["hour", "minute", "dayPeriod"].includes(part.type)
    );
    const preceding = parts[timeIndex - 1];
    if (preceding?.type === "literal") {
      // The literal can begin with a suffix belonging to the date itself (the
      // "日" in Japanese, the " р." in Ukrainian). It shows up as the trailing
      // literal of the date-only format, so it can be stripped off.
      const dateParts = new Intl.DateTimeFormat(tag, {
        dateStyle: "long",
      }).formatToParts(sample);
      const dateSuffix = dateParts[dateParts.length - 1];

      let value = preceding.value;
      if (
        dateSuffix?.type === "literal" &&
        value.startsWith(dateSuffix.value)
      ) {
        value = value.slice(dateSuffix.value.length);
      }
      const whitespace = value.search(/\s/);
      separator = whitespace === -1 ? " " : value.slice(whitespace);
    }
  }

  separators.set(tag, separator);
  return separator;
}

/**
 * Combines the readable date and time halves of a label with the separator
 * appropriate for the locale.
 */
function joinDateAndTime(
  dateString: string,
  timeString: string,
  language?: keyof typeof locales | null
): string {
  return `${dateString}${dateTimeSeparator(language)}${timeString}`;
}

/**
 * Formats a date mention's stored ISO value into an absolute, localized,
 * human-readable label. The year is omitted within the current year (e.g.
 * "January 2nd") and included otherwise (e.g. "February 3rd, 2024"). The time
 * is appended when the value is time-specific (e.g. "January 2nd at 1:00 PM").
 * Suitable for plaintext and markdown serialization.
 *
 * @param iso The stored ISO string.
 * @param language The user's language preference.
 * @returns the absolute human-readable date, or the original string when invalid.
 */
export function dateToReadable(
  iso: string,
  language?: keyof typeof locales | null
): string {
  const date = parseISODate(iso);
  if (!date) {
    return iso;
  }
  const locale = dateLocale(language);
  const dateString = isSameYear(date, new Date())
    ? format(date, "MMMM do", { locale })
    : format(date, "MMMM do, yyyy", { locale });

  if (!hasTimeComponent(iso)) {
    return dateString;
  }
  return joinDateAndTime(dateString, format(date, "p", { locale }), language);
}

/**
 * Formats a date mention's stored ISO value into a relative, localized,
 * human-readable label with increasing granularity. Returns "Today",
 * "Tomorrow" or "Yesterday" where applicable, "January 2nd" within the
 * current year, and "February 3rd, 2024" otherwise. The time is appended when
 * the value is time-specific (e.g. "Tomorrow at 1:00 PM").
 *
 * @param iso The stored ISO string.
 * @param t The translation function.
 * @param language The user's language preference.
 * @returns the relative human-readable date, or the original string when invalid.
 */
export function dateToRelativeReadable(
  iso: string,
  t: (key: string) => string,
  language?: keyof typeof locales | null
): string {
  const date = parseISODate(iso);
  if (!date) {
    return iso;
  }

  const locale = dateLocale(language);
  let dateString;

  if (isToday(date)) {
    dateString = t("Today");
  } else if (isTomorrow(date)) {
    dateString = t("Tomorrow");
  } else if (isYesterday(date)) {
    dateString = t("Yesterday");
  } else if (isSameYear(date, new Date())) {
    dateString = format(date, "MMMM do", { locale });
  } else {
    dateString = format(date, "MMMM do, yyyy", { locale });
  }

  if (!hasTimeComponent(iso)) {
    return dateString;
  }
  return joinDateAndTime(dateString, format(date, "p", { locale }), language);
}
