import path from "node:path";
import mammoth from "mammoth";
import { FileImportError } from "@server/errors";
import { traceFunction } from "@server/logging/tracing";
import ZipHelper from "@server/utils/ZipHelper";
import { BaseConverter } from "./BaseConverter";

/** Maximum number of entries a Word document may contain. */
const DOCX_MAX_ENTRIES = 5000;

/**
 * Maximum number of bytes that the parts may grow by when uncompressed. Mammoth
 * holds a parsed tree of each XML part, which needs many times its size in
 * memory. Media is already compressed and grows by almost nothing.
 */
const DOCX_MAX_EXPANSION = 10 * 1024 * 1024;

/** An opened archive that mammoth reads parts from. */
interface DocxArchive {
  exists(name: string): boolean;
  read(name: string, encoding?: string): Promise<Uint8Array | string>;
}

/**
 * Mammoth accepts an opened archive in place of a buffer, which its own tests
 * use, but its types do not include this input.
 */
const convertArchiveToHtml = mammoth.convertToHtml as unknown as (input: {
  file: DocxArchive;
}) => Promise<{ value: string }>;

/**
 * Converts Word (.docx) files to HTML.
 */
export class DocxConverter extends BaseConverter {
  /**
   * Convert a docx file to HTML using mammoth.
   *
   * @param content The docx file content as a Buffer.
   * @returns The HTML representation of the document.
   * @throws {FileImportError} if the file is not a readable Word document, or
   *   is too large when uncompressed.
   */
  public static async toHtml(content: Buffer | string): Promise<string> {
    if (!(content instanceof Buffer)) {
      throw FileImportError("Unsupported Word file");
    }

    const parts = await this.readParts(content);

    return traceFunction({ spanName: "convertToHtml" })(this.convertToHtml)(
      parts
    );
  }

  /**
   * Decompress each part into memory. The archive is read here rather than by
   * mammoth, as mammoth does not limit or check the uncompressed sizes. All
   * parts are counted, as mammoth finds them through relationships rather than
   * by name.
   *
   * @param buffer The docx file content.
   * @returns The uncompressed parts, keyed by normalized path.
   * @throws {FileImportError} if the file is not a readable zip archive, or
   *   grows too large when uncompressed.
   */
  private static async readParts(buffer: Buffer): Promise<Map<string, Buffer>> {
    const parts = new Map<string, Buffer>();
    let expansion = 0;
    let totalSize = 0;
    let tooLarge = false;

    try {
      await ZipHelper.walk(
        buffer,
        async (entry) => {
          if (entry.isDirectory) {
            return;
          }

          const remaining = DOCX_MAX_EXPANSION - expansion;

          // Entries can share stored data, so also bound the total bytes read.
          if (
            entry.uncompressedSize - entry.compressedSize > remaining ||
            totalSize + entry.uncompressedSize >
              buffer.length + DOCX_MAX_EXPANSION
          ) {
            tooLarge = true;
            throw FileImportError(
              "The Word document is too large to import when uncompressed"
            );
          }

          // The read limit also covers entries whose declared size is wrong.
          const data = await entry.readBuffer(entry.compressedSize + remaining);
          expansion += Math.max(0, data.length - entry.compressedSize);
          totalSize += data.length;
          parts.set(path.posix.normalize(entry.fileName), data);
        },
        { maxEntries: DOCX_MAX_ENTRIES }
      );
    } catch (error) {
      if (tooLarge) {
        throw error;
      }
      throw FileImportError("The Word document could not be read");
    }

    return parts;
  }

  private static async convertToHtml(
    parts: Map<string, Buffer>
  ): Promise<string> {
    const file: DocxArchive = {
      exists: (name) => parts.has(name),
      read: async (name, encoding) => {
        const data = parts.get(name);
        if (!data) {
          throw new Error(`Missing part ${name}`);
        }
        if (encoding === "base64") {
          return data.toString("base64");
        }
        if (encoding) {
          return new TextDecoder(encoding).decode(data);
        }
        return data;
      },
    };

    try {
      const { value } = await convertArchiveToHtml({ file });
      return value;
    } catch {
      throw FileImportError("The Word document could not be read");
    }
  }
}
