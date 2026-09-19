import { parse } from "@fast-csv/parse";
import { escapeRegExp } from "es-toolkit/compat";
import { FileImportError } from "@server/errors";
import { BaseConverter } from "./BaseConverter";

/**
 * Converts delimiter separated values (CSV, TSV) to a markdown table.
 */
export class CsvConverter extends BaseConverter {
  /**
   * Convert a CSV file to a markdown table.
   *
   * @param content The CSV file content.
   * @returns A markdown table representation.
   */
  public static async toMarkdown(content: Buffer | string): Promise<string> {
    return new Promise((resolve, reject) => {
      const text = this.bufferToString(content).trim();
      const textLines = text.split("\n");

      // Find the first non-empty line to determine the delimiter
      const firstNonEmptyLine =
        textLines.find((line) => line.trim().length > 0) || "";

      // Determine the separator used in the CSV file based on number of occurrences of each separator on first line
      const delimiter = [";", ",", "\t"].reduce(
        (acc, separator) => {
          const count = (
            firstNonEmptyLine.match(new RegExp(escapeRegExp(separator), "g")) ||
            []
          ).length;
          return count > acc.count ? { count, separator } : acc;
        },
        { count: 0, separator: "," }
      ).separator;

      const lines: string[][] = [];
      const stream = parse({ delimiter })
        .on("error", (error) => {
          reject(
            FileImportError(`There was an error parsing the CSV file: ${error}`)
          );
        })
        .on("data", (row) => lines.push(row))
        .on("end", () => {
          // Filter out completely empty rows
          const nonEmptyLines = lines.filter((row) =>
            row.some((cell) => cell.trim() !== "")
          );

          if (nonEmptyLines.length === 0) {
            resolve("");
            return;
          }

          // Check if all rows have a trailing empty cell (trailing comma artifact)
          // Only trim if ALL non-empty rows end with an empty cell
          let trimmedLines = nonEmptyLines;
          while (
            trimmedLines.length > 0 &&
            trimmedLines.every(
              (row) => row.length > 0 && row[row.length - 1].trim() === ""
            )
          ) {
            trimmedLines = trimmedLines.map((row) => row.slice(0, -1));
          }

          // Find the most common column count
          const columnCounts = new Map<number, number>();
          for (const row of trimmedLines) {
            if (row.length > 0) {
              columnCounts.set(
                row.length,
                (columnCounts.get(row.length) || 0) + 1
              );
            }
          }

          // Get the column count that appears most frequently
          let expectedColumns = 0;
          let maxFrequency = 0;
          for (const [count, frequency] of columnCounts) {
            if (frequency > maxFrequency) {
              maxFrequency = frequency;
              expectedColumns = count;
            }
          }

          // Find the first row with the expected column count (this is the header)
          const headerIndex = trimmedLines.findIndex(
            (row) => row.length === expectedColumns
          );
          if (headerIndex === -1) {
            resolve("");
            return;
          }

          const headers = trimmedLines[headerIndex];
          const dataRows = trimmedLines
            .slice(headerIndex + 1)
            .filter((row) => row.length === expectedColumns);

          const table = dataRows
            .map((cells) => `| ${cells.join(" | ")} |`)
            .join("\n");

          const headerLine = `| ${headers.join(" | ")} |`;
          const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;

          resolve(`${headerLine}\n${separatorLine}\n${table}\n`);
        });

      stream.write(text);
      stream.end();
    });
  }
}
