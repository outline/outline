import mammoth from "mammoth";
import { FileImportError } from "@server/errors";
import { traceFunction } from "@server/logging/tracing";
import { BaseConverter } from "./BaseConverter";

/**
 * Converts Word (.docx) files to HTML.
 */
export class DocxConverter extends BaseConverter {
  /**
   * Convert a docx file to HTML using mammoth.
   *
   * @param content The docx file content as a Buffer.
   * @returns The HTML representation of the document.
   */
  public static async toHtml(content: Buffer | string): Promise<string> {
    if (content instanceof Buffer) {
      const { value } = await traceFunction({ spanName: "convertToHtml" })(
        mammoth.convertToHtml
      )({
        buffer: content,
      });
      return value;
    }
    throw FileImportError("Unsupported Word file");
  }
}
