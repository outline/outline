import { parse } from "@fast-csv/parse";
import escapeRegExp from "lodash/escapeRegExp";
import { simpleParser } from "mailparser";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse");
import { FileImportError } from "@server/errors";
import { trace, traceFunction } from "@server/logging/tracing";
import turndownService from "@server/utils/turndown";

@trace()
export class DocumentConverter {
  /**
   * Convert an incoming file to markdown.
   * @param content The content of the file.
   * @param fileName The name of the file, including extension.
   * @param mimeType The mime type of the file.
   * @returns The markdown representation of the file.
   */
  public static async convertToMarkdown(
    content: Buffer | string,
    fileName: string,
    mimeType: string
  ) {
    return (
      await this.internalConvertToMarkdown(content, fileName, mimeType)
    ).trim();
  }

  private static async internalConvertToMarkdown(
    content: Buffer | string,
    fileName: string,
    mimeType: string
  ) {
    // First try to convert the file based on the mime type.
    switch (mimeType) {
      case "application/msword":
        return this.confluenceToMarkdown(content);
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return this.docXToMarkdown(content);
      case "text/html":
        return this.htmlToMarkdown(content);
      case "text/plain":
      case "text/markdown":
        return this.fileToMarkdown(content);
      case "text/csv":
        return this.csvToMarkdown(content);
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return this.excelToMarkdown(content);
      case "application/pdf":
        return this.pdfToMarkdown(content);
      default:
        break;
    }

    // If the mime type doesn't work, try to convert based on the file extension.
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "docx":
        return this.docXToMarkdown(content);
      case "html":
        return this.htmlToMarkdown(content);
      case "md":
      case "markdown":
        return this.fileToMarkdown(content);
      case "xlsx":
      case "xls":
        return this.excelToMarkdown(content);
      case "pdf":
        return this.pdfToMarkdown(content);
      default:
        throw FileImportError(`File type ${mimeType} not supported`);
    }
  }

  public static async docXToMarkdown(content: Buffer | string) {
    if (content instanceof Buffer) {
      const { value } = await traceFunction({ spanName: "convertToHtml" })(
        mammoth.convertToHtml
      )({
        buffer: content,
      });

      return turndownService.turndown(value);
    }

    throw FileImportError("Unsupported Word file");
  }

  public static async htmlToMarkdown(content: Buffer | string) {
    if (typeof content !== "string") {
      content = content.toString("utf8");
    }

    return turndownService.turndown(content);
  }

  public static csvToMarkdown(content: Buffer | string): Promise<string> {
    return new Promise((resolve, reject) => {
      const text = this.fileToMarkdown(content).trim();
      const firstLine = text.split("\n")[0];

      // Determine the separator used in the CSV file based on number of occurrences of each separator on first line
      const delimiter = [";", ",", "\t"].reduce(
        (acc, separator) => {
          const count = (
            firstLine.match(new RegExp(escapeRegExp(separator), "g")) || []
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
          const headers = lines[0];
          const table = lines
            .slice(1)
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

  public static fileToMarkdown(content: Buffer | string) {
    if (typeof content !== "string") {
      content = content.toString("utf8");
    }
    return content;
  }

  public static async confluenceToMarkdown(content: Buffer | string) {
    if (typeof content !== "string") {
      content = content.toString("utf8");
    }

    // We're only supporting the output from Confluence here, regular Word documents should call
    // into the docxToMarkdown importer. See: https://jira.atlassian.com/browse/CONFSERVER-38237
    if (!content.includes("Content-Type: multipart/related")) {
      throw FileImportError("Unsupported Word file");
    }

    // Confluence "Word" documents are actually just multi-part email messages, so we can use
    // mailparser to parse the content.
    const parsed = await simpleParser(content);
    if (!parsed.html) {
      throw FileImportError("Unsupported Word file (No content found)");
    }

    // Replace the content-location with a data URI for each attachment.
    for (const attachment of parsed.attachments) {
      const contentLocation = String(
        attachment.headers.get("content-location") ?? ""
      );

      const id = contentLocation.split("/").pop();
      if (!id) {
        continue;
      }

      parsed.html = parsed.html.replace(
        new RegExp(escapeRegExp(id), "g"),
        `data:image/png;base64,${attachment.content.toString("base64")}`
      );
    }

    // If we don't remove the title here it becomes printed in the document
    // body by turndown
    turndownService.remove(["style", "title"]);

    // Now we should have something that looks like HTML
    const html = turndownService.turndown(parsed.html);
    return html.replace(/<br>/g, " \\n ");
  }

  /**
   * Converts an Excel file (XLSX or XLS) to markdown format.
   * Each sheet becomes a separate markdown table.
   *
   * @param content The Excel file content as Buffer
   * @returns Markdown representation with tables for each sheet
   */
  public static async excelToMarkdown(
    content: Buffer | string
  ): Promise<string> {
    if (typeof content === "string") {
      throw FileImportError("Excel files must be provided as Buffer");
    }

    try {
      const workbook = XLSX.read(content, { type: "buffer" });
      const sheetNames = workbook.SheetNames;
      const markdownParts: string[] = [];

      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        }) as string[][];

        if (jsonData.length === 0) {
          continue;
        }

        // Add sheet name as heading if multiple sheets
        if (sheetNames.length > 1) {
          markdownParts.push(`## ${sheetName}\n`);
        }

        // Convert to markdown table
        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        if (headers.length > 0) {
          const headerLine = `| ${headers.join(" | ")} |`;
          const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
          markdownParts.push(headerLine);
          markdownParts.push(separatorLine);

          for (const row of rows) {
            // Pad row to match header length
            const paddedRow = [
              ...row,
              ...Array(Math.max(0, headers.length - row.length)).fill(""),
            ];
            markdownParts.push(`| ${paddedRow.join(" | ")} |`);
          }

          markdownParts.push(""); // Empty line between sheets
        }
      }

      return markdownParts.join("\n");
    } catch (error) {
      throw FileImportError(
        `Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Converts a PDF file to markdown format.
   * Extracts text content from the PDF while preserving structure, indentation, and formatting.
   *
   * @param content The PDF file content as Buffer
   * @returns Markdown representation of the PDF text with preserved structure
   */
  public static async pdfToMarkdown(
    content: Buffer | string
  ): Promise<string> {
    if (typeof content === "string") {
      throw FileImportError("PDF files must be provided as Buffer");
    }

    try {
      // Create PDFParse instance with the buffer data
      const pdf = new PDFParse({ data: content });

      // Get text with enhanced parsing options to preserve structure
      // - parseHyperlinks: detect and format URLs as Markdown links
      // - lineEnforce: preserve line breaks based on vertical spacing
      // - cellSeparator: use tab for table-like structures
      const textResult = await pdf.getText({
        parseHyperlinks: true,
        lineEnforce: true,
        lineThreshold: 4.6,
        cellSeparator: "\t",
        cellThreshold: 7,
      });

      // Get document info for metadata
      const infoResult = await pdf.getInfo({ parsePageInfo: true });

      // Try to extract tables if available
      let tablesMarkdown = "";
      try {
        const tableResult = await pdf.getTable();
        if (tableResult && tableResult.mergedTables && tableResult.mergedTables.length > 0) {
          tablesMarkdown = "\n\n" + this.formatTablesAsMarkdown(tableResult.mergedTables);
        }
      } catch (tableError) {
        // Tables extraction is optional, continue without them
      }

      let text = textResult.text;

      // Extract hashtags from the text
      const hashtags = this.extractHashtags(text);

      // Process text to preserve structure while cleaning up
      text = this.processPdfText(text);

      // Clean up PDF instance
      await pdf.destroy();

      // If text is empty, provide a helpful message
      if (!text || text.length === 0) {
        return `> **Note:** This PDF file could not be parsed or contains no extractable text.\n> Number of pages: ${infoResult.total}`;
      }

      // Add metadata as a note at the top
      const metadata = [];
      if (infoResult.info?.Title) {
        metadata.push(`**Title:** ${infoResult.info.Title}`);
      }
      if (infoResult.info?.Author) {
        metadata.push(`**Author:** ${infoResult.info.Author}`);
      }
      if (infoResult.total) {
        metadata.push(`**Pages:** ${infoResult.total}`);
      }

      const metadataText =
        metadata.length > 0 ? `> ${metadata.join(" | ")}\n\n` : "";

      // Add hashtags at the end of the document if any were found
      // Format them as inline code to make them more visible and distinct
      const hashtagsText =
        hashtags.length > 0
          ? `\n\n---\n\n**Хэш-теги:** ${hashtags.map((tag) => `\`#${tag}\``).join(" ")}`
          : "";

      return `${metadataText}${text}${tablesMarkdown}${hashtagsText}`;
    } catch (error) {
      throw FileImportError(
        `Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Processes PDF text to preserve structure, indentation, and formatting.
   * 
   * @param text Raw text from PDF
   * @returns Processed text with preserved structure
   */
  private static processPdfText(text: string): string {
    if (!text) {
      return "";
    }

    // Split into lines for processing
    const lines = text.split("\n");
    const processedLines: string[] = [];
    let previousLineWasEmpty = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const isEmpty = trimmedLine.length === 0;

      // Skip excessive empty lines (more than 2 consecutive)
      if (isEmpty) {
        if (!previousLineWasEmpty) {
          processedLines.push("");
          previousLineWasEmpty = true;
        }
        continue;
      }

      previousLineWasEmpty = false;

      // Detect and preserve indentation (leading spaces/tabs)
      const leadingWhitespace = line.match(/^(\s+)/)?.[1] || "";

      // Count indentation level (using 2 spaces as base unit)
      const indentLevel = Math.floor(leadingWhitespace.length / 2);

      // Preserve meaningful indentation (up to 6 levels)
      let processedLine = trimmedLine;
      if (indentLevel > 0 && indentLevel <= 6) {
        // Use markdown list or code block indentation
        // For lists, detect if line starts with bullet-like characters
        const isListItem = /^[•\-\*\+]\s/.test(trimmedLine);
        if (isListItem) {
          // It's already a list item, preserve as is
          processedLine = "  ".repeat(Math.min(indentLevel, 3)) + trimmedLine;
        } else {
          // Regular indented text - preserve with spaces
          processedLine = "  ".repeat(Math.min(indentLevel, 4)) + trimmedLine;
        }
      }

      // Detect and format headings (lines that are short and all caps or have specific patterns)
      if (trimmedLine.length < 100 && /^[A-ZА-ЯЁ][A-ZА-ЯЁ\s\d:]+$/.test(trimmedLine)) {
        // Likely a heading - format as markdown heading
        const headingLevel = indentLevel === 0 ? 2 : Math.min(indentLevel + 1, 6);
        processedLine = "#".repeat(headingLevel) + " " + trimmedLine;
      }

      // Detect numbered lists and format them
      if (/^\d+[\.\)]\s/.test(trimmedLine)) {
        processedLine = trimmedLine; // Keep numbered lists as is
      }

      // Detect bullet lists and ensure proper formatting
      if (/^[•\-\*\+]\s/.test(trimmedLine)) {
        processedLine = "- " + trimmedLine.replace(/^[•\-\*\+]\s/, "");
      }

      // Preserve and highlight hashtags in the text
      // Format hashtags as inline code to make them more visible: #tag -> `#tag`
      // But only if they're not already in code blocks
      if (!processedLine.startsWith("```") && !processedLine.startsWith("`")) {
        // Match hashtags that are not already in code format
        processedLine = processedLine.replace(
          /(^|\s)(#[\p{L}][\p{L}\p{N}_]{1,49})(\s|$|[.,;:!?])/gu,
          (match, before, tag, after) => {
            // Don't format if it's already in a code block context
            return `${before}\`${tag}\`${after}`;
          }
        );
      }

      processedLines.push(processedLine);
    }

    // Join lines and clean up excessive spacing
    let result = processedLines.join("\n");

    // Clean up: remove more than 2 consecutive newlines
    result = result.replace(/\n{3,}/g, "\n\n");

    // Clean up: remove trailing whitespace from each line
    result = result
      .split("\n")
      .map((line) => {
        // Preserve intentional indentation but remove trailing spaces
        const match = line.match(/^(\s*)(.*?)(\s*)$/);
        if (match) {
          return match[1] + match[2];
        }
        return line;
      })
      .join("\n");

    return result.trim();
  }

  /**
   * Extracts hashtags from text.
   * Finds all hashtags in the format #word or #word123 (alphanumeric, supports Unicode).
   * 
   * @param text The text to extract hashtags from
   * @returns Array of unique hashtag names (without # symbol)
   */
  private static extractHashtags(text: string): string[] {
    if (!text) {
      return [];
    }

    // Match hashtags: # followed by word characters (letters, numbers, underscores, Unicode)
    // Exclude # at the start of lines (markdown headings) and numbers only
    // Pattern: #word where word can contain letters, numbers, underscores, and Unicode characters
    // Must start with a letter or Unicode character (not just numbers)
    const hashtagRegex = /(?:^|\s)#([\p{L}][\p{L}\p{N}_]*)/gu;
    const matches = text.matchAll(hashtagRegex);
    const hashtags = new Set<string>();

    for (const match of matches) {
      const tag = match[1];
      // Filter out very short tags (less than 2 characters) and very long ones (more than 50)
      // Also filter out tags that are only numbers
      if (tag && tag.length >= 2 && tag.length <= 50 && /[\p{L}]/u.test(tag)) {
        // Keep original case for display, but use lowercase for deduplication
        hashtags.add(tag);
      }
    }

    // Convert to array, normalize to lowercase for deduplication, then restore original case
    const normalized = new Map<string, string>();
    for (const tag of hashtags) {
      const lower = tag.toLowerCase();
      if (!normalized.has(lower)) {
        normalized.set(lower, tag);
      }
    }

    // Sort by lowercase version but return original case
    return Array.from(normalized.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }

  /**
   * Formats extracted tables as Markdown tables.
   * 
   * @param tables Array of table data (2D arrays)
   * @returns Markdown formatted tables
   */
  private static formatTablesAsMarkdown(tables: string[][]): string {
    if (!tables || tables.length === 0) {
      return "";
    }

    const formattedTables: string[] = [];

    for (const table of tables) {
      if (!table || table.length === 0) {
        continue;
      }

      // Ensure all rows are arrays
      const tableRows: string[][] = table.map((row) => {
        if (Array.isArray(row)) {
          return row.map((cell) => String(cell || ""));
        }
        return [String(row || "")];
      });

      // Find the maximum number of columns
      const maxCols = Math.max(...tableRows.map((row) => row.length), 1);

      // Normalize rows to have the same number of columns
      const normalizedTable = tableRows.map((row) => {
        const normalizedRow = [...row];
        while (normalizedRow.length < maxCols) {
          normalizedRow.push("");
        }
        return normalizedRow.slice(0, maxCols);
      });

      if (normalizedTable.length === 0) {
        continue;
      }

      // Format as Markdown table
      const markdownRows: string[] = [];

      // Header row
      const header = normalizedTable[0];
      markdownRows.push("| " + header.map((cell: string) => String(cell || "").trim()).join(" | ") + " |");

      // Separator row
      markdownRows.push("| " + header.map(() => "---").join(" | ") + " |");

      // Data rows
      for (let i = 1; i < normalizedTable.length; i++) {
        const row = normalizedTable[i];
        markdownRows.push("| " + row.map((cell: string) => String(cell || "").trim()).join(" | ") + " |");
      }

      formattedTables.push(markdownRows.join("\n"));
    }

    return formattedTables.join("\n\n");
  }
}
