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
   * @throws {FileImportError} if the file is not a readable Word document.
   */
  public static async toHtml(content: Buffer | string): Promise<string> {
    if (!(content instanceof Buffer)) {
      throw FileImportError("Unsupported Word file");
    }

    return traceFunction({ spanName: "convertToHtml" })(this.convertToHtml)(
      content
    );
  }

  private static async convertToHtml(buffer: Buffer): Promise<string> {
    try {
      const { value } = await mammoth.convertToHtml({ buffer });
      return value;
    } catch {
      throw FileImportError("The Word document could not be read");
    }
  }
}
