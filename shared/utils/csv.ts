/* oxlint-disable no-control-regex */

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
        // Control characters (excluding tab, newline, and carriage return)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu, "")
        // Zero-width spaces
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        // Bidirectional control
        .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    );
  }

  /**
   * Escapes a CSV field value by wrapping it in quotes if necessary.
   *
   * @param value The value to escape.
   * @returns The escaped value.
   */
  public static escapeCSVField(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    const stringValue = String(value);

    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Converts an array of objects to CSV format.
   *
   * @param data Array of objects to convert.
   * @param headers Array of header names in the desired order.
   * @returns CSV string.
   */
  public static convertToCSV<T extends Record<string, unknown>>(
    data: T[],
    headers: (keyof T)[]
  ): string {
    if (data.length === 0) {
      return (
        headers
          .map((h) => String(h))
          .map((h) => this.escapeCSVField(this.sanitizeValue(h)))
          .join(",") + "\n"
      );
    }

    // Create header row
    const headerRow = headers
      .map((h) => String(h))
      .map((h) => this.escapeCSVField(this.sanitizeValue(h)))
      .join(",");

    // Create data rows
    const dataRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const stringValue =
            value === null || value === undefined ? "" : String(value);
          return this.escapeCSVField(this.sanitizeValue(stringValue));
        })
        .join(",")
    );

    return [headerRow, ...dataRows].join("\n");
  }
}
