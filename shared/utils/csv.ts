/* eslint-disable no-control-regex */

/**
 * Helper class for CSV operations.
 */
export class CSVHelper {
  /**
   * Sanitizes a value for CSV output.
   *
   * @param value The value to sanitize.
   * @returns The sanitized value.
   */
  public static sanitizeValue(value: string): string {
    if (!value) {
      return "";
    }

    return (
      value
        .toString()
        // Formula triggers
        .replace(/^([+\-=@∑√∏<>＜＞≤≥＝≠±÷×])/u, "'$1")
        // Control characters
        .replace(/[\u0000-\u001F\u007F-\u009F]/gu, "")
        // Zero-width spaces
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        // Bidirectional control
        .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    );
  }
}
