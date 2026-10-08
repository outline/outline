import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
  unicodeCLDRtoBCP47,
} from "./date";

interface User {
  name: string;
  language: string | null;
}

export class TextHelper {
  /**
   * Replaces template variables in the given text with the current date and time.
   *
   * @param text The text to replace the variables in
   * @param user The user to get the language/locale from
   * @returns The text with the variables replaced
   */
  static replaceTemplateVariables(text: string, user: User) {
    const locales = user.language
      ? unicodeCLDRtoBCP47(user.language)
      : undefined;

    return text
      .replace(/{date}/g, getCurrentDateAsString(locales))
      .replace(/{time}/g, getCurrentTimeAsString(locales))
      .replace(/{datetime}/g, getCurrentDateTimeAsString(locales))
      .replace(/{author}/g, user.name);
  }

  /**
   * Returns the length of the text in Unicode code points rather than UTF-16
   * code units, matching the server-side length validation.
   *
   * @param text The text to measure
   * @returns The number of code points in the text
   */
  static codePointLength(text: string): number {
    return Array.from(text).length;
  }

  /**
   * Truncates the text to a maximum number of Unicode code points without
   * splitting surrogate pairs.
   *
   * @param text The text to truncate
   * @param maxLength The maximum number of code points to keep
   * @returns The truncated text
   */
  static truncate(text: string, maxLength: number): string {
    return Array.from(text).slice(0, Math.max(0, maxLength)).join("");
  }
}
