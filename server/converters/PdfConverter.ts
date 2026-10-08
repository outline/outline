import { errToString, toError } from "@shared/utils/error";
import { FileImportError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { traceFunction } from "@server/logging/tracing";
import { BaseConverter } from "./BaseConverter";

/**
 * Converts PDF files to markdown.
 */
export class PdfConverter extends BaseConverter {
  /**
   * Convert a PDF file to markdown, recovering headings, lists and tables from
   * the layout of the text on the page. A PDF with no embedded text, such as a
   * scan or an export of images, cannot be read without OCR and is rejected.
   *
   * @param content The PDF file content as a Buffer.
   * @returns The markdown representation of the document.
   * @throws {FileImportError} if the file is not a readable PDF, or holds no
   *   text that can be extracted.
   */
  public static async toMarkdown(content: Buffer | string): Promise<string> {
    if (!(content instanceof Buffer)) {
      throw FileImportError("Unsupported PDF file");
    }

    const { processPdf } = await this.parser();
    let markdown: string | undefined;

    try {
      // Parsing is native and synchronous, holding the event loop until done.
      ({ markdown } = traceFunction({ spanName: "processPdf" })(processPdf)(
        content
      ));
    } catch (err) {
      throw FileImportError(
        `There was an error parsing the PDF file: ${errToString(err)}`
      );
    }

    if (!markdown?.trim()) {
      throw FileImportError(
        "The PDF file contains no text that could be imported, it may be a scanned document"
      );
    }

    return this.replaceUnderlineTags(markdown);
  }

  /**
   * Markdown has no syntax for underline, so the parser writes underlined text
   * as an HTML `<u>` element. Inline HTML is not enabled when the markdown is
   * read back, which would leave the tags in the document as literal text, so
   * they are rewritten to the underline syntax the editor does understand.
   *
   * @param markdown The markdown emitted by the parser.
   * @returns The markdown with underline tags replaced.
   */
  private static replaceUnderlineTags(markdown: string): string {
    return (
      markdown
        .replace(
          // Underlines do not span lines, so a tag left open by the end of one
          // is unpaired and falls through to be stripped below.
          /<u>([^\n]*?)<\/u>/gi,
          (_match, content: string) => {
            // The delimiters must sit against the text, and an underline of
            // only whitespace has nothing to mark up.
            const text = content.trim();
            if (!text) {
              return content;
            }
            const before = content.slice(
              0,
              content.length - content.trimStart().length
            );
            const after = content.slice(content.trimEnd().length);
            return `${before}__${text}__${after}`;
          }
        )
        // Any unpaired tag is dropped rather than shown to the reader.
        .replace(/<\/?u>/gi, "")
    );
  }

  /**
   * The parser is a native addon shipped as a prebuilt binary per platform, so
   * loading it can fail where no binary is published for the host.
   *
   * @returns The parser module.
   * @throws {FileImportError} if no binary is available for this platform.
   */
  private static async parser() {
    try {
      return await import("@firecrawl/pdf-inspector");
    } catch (err) {
      Logger.error("Failed to load the PDF parser", toError(err));
      throw FileImportError(
        "PDF files cannot be imported on this server's platform"
      );
    }
  }
}
