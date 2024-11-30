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
}
