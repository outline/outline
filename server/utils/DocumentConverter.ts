import { escape, escapeRegExp } from "es-toolkit/compat";
import type { Attachment as MailAttachment, ParsedMail } from "mailparser";
import type { Node } from "prosemirror-model";
import { DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import yaml from "js-yaml";
import { schema, serializer } from "@server/editor";
import { FileImportError } from "@server/errors";
import { trace, traceFunction } from "@server/logging/tracing";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";

export interface ConvertResult {
  /** The document content as markdown text. */
  text: string;
  /** The document content as Prosemirror. */
  doc: Node;
  /** The extracted title (from H1 heading if present). */
  title: string;
  /** The extracted emoji/icon from start of document. */
  icon?: string;
}

/**
 * Converts incoming files of various formats to structured documents.
 */
@trace()
export class DocumentConverter {
  /**
   * Convert an incoming file to a structured document result.
   *
   * @param content The content of the file.
   * @param fileName The name of the file, including extension.
   * @param mimeType The mime type of the file.
   * @param options Conversion options.
   * @param options.extractTitle Whether a leading H1 heading should be lifted
   *   out as the document title and removed from the body. Defaults to true;
   *   set false for sources where the filename is authoritative and the first
   *   heading must remain part of the content (e.g. Slab).
   * @returns The converted document with text, data, title, and icon.
   */
  public static async convert(
    content: Buffer | string,
    fileName: string,
    mimeType: string,
    options: { extractTitle?: boolean } = {}
  ): Promise<ConvertResult> {
    const { extractTitle = true } = options;
    let doc: Node;

    // Route to appropriate conversion method
    const html = await this.convertToHtml(content, fileName, mimeType);
    if (html !== undefined) {
      doc = await this.htmlToProsemirror(html);
    } else {
      const markdown = await this.convertToMarkdown(
        content,
        fileName,
        mimeType
      );
      doc = ProsemirrorHelper.toProsemirror(markdown);
    }

    // Extract title from first H1 heading
    let title = "";
    if (extractTitle) {
      const headings = ProsemirrorHelper.getHeadings(doc);
      if (headings.length > 0 && headings[0].level === 1) {
        title = headings[0].title;
        doc = ProsemirrorHelper.removeFirstHeading(doc);
      }
    }

    // Extract emoji from start of document
    const { emoji: icon, doc: docWithoutEmoji } =
      ProsemirrorHelper.extractEmojiFromStart(doc);
    doc = docWithoutEmoji;

    // Serialize to markdown and trim whitespace
    const text = serializer.serialize(doc).trim();

    return {
      text,
      doc,
      title,
      icon,
    };
  }

  /**
   * Convert HTML content directly to a Prosemirror document node.
   *
   * @param content The HTML content as a string or Buffer.
   * @returns A Prosemirror Node representing the document.
   */
  public static async htmlToProsemirror(
    content: Buffer | string
  ): Promise<Node> {
    if (typeof content !== "string") {
      content = content.toString("utf8");
    }

    // Loaded lazily to keep jsdom off the startup path — only HTML imports need it.
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(content);
    const document = dom.window.document;

    // Remove problematic elements before parsing
    const elementsToRemove = document.querySelectorAll(
      "script, style, title, head, meta, link"
    );
    elementsToRemove.forEach((el) => el.remove());

    // Preprocess the DOM to handle edge cases
    this.preprocessHtmlForImport(document);

    // Patch global environment for Prosemirror DOMParser
    const cleanup = ProsemirrorHelper.patchGlobalEnv(dom.window);

    try {
      const domParser = ProsemirrorDOMParser.fromSchema(schema);
      return domParser.parse(document.body);
    } finally {
      cleanup();
      try {
        dom.window.close();
      } catch (_err) {
        // Best effort, closing the window releases its timers and resources.
      }
    }
  }

  /**
   * Preprocesses HTML DOM before Prosemirror parsing to cleanup
   * images and other elements.
   *
   * @param document The DOM document to preprocess.
   */
  private static preprocessHtmlForImport(document: Document): void {
    // Handle images: filter emoticons, remove Jira icons, apply Confluence sizing
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      const className = img.className || "";

      // Skip emoticon images (they'll be dropped)
      if (className.includes("emoticon")) {
        img.remove();
        return;
      }

      // Remove Jira icon images
      if (
        className === "icon" &&
        img.parentElement?.className.includes("jira-issue-key")
      ) {
        img.remove();
        return;
      }

      // Handle Confluence image sizing: data-width/data-height → width/height
      const dataWidth = img.getAttribute("data-width");
      const dataHeight = img.getAttribute("data-height");
      const width = img.getAttribute("width");

      if (dataWidth && dataHeight && width) {
        const ratio = parseInt(dataWidth) / parseInt(width);
        const calculatedHeight = Math.round(parseInt(dataHeight) / ratio);
        img.setAttribute("height", String(calculatedHeight));
      }

      // Extract dimensions from data URI images that lack width/height
      // (e.g. images embedded by mammoth during docx import).
      // Only decode a small prefix of the base64 data — headers for all
      // supported formats live within the first 64 KB of the file.
      if (!img.getAttribute("width") && !img.getAttribute("height")) {
        const src = img.getAttribute("src") || "";
        if (src.startsWith("data:") && src.includes(";base64,")) {
          const base64Start = src.indexOf(";base64,") + 8;
          // 4 base64 chars → 3 bytes; decode at most ~64 KB of image data.
          const maxBase64Chars = Math.ceil(65536 / 3) * 4;
          const base64Prefix = src.slice(
            base64Start,
            base64Start + maxBase64Chars
          );
          const dimensions = this.getImageDimensionsFromBuffer(
            Buffer.from(base64Prefix, "base64")
          );
          if (dimensions) {
            img.setAttribute("width", String(dimensions.width));
            img.setAttribute("height", String(dimensions.height));
          }
        }
      }
    });
  }

  /**
   * Attempts to convert content to HTML for formats that support it.
   * Returns undefined for formats that should be parsed as markdown directly.
   *
   * @param content The content of the file.
   * @param fileName The name of the file, including extension.
   * @param mimeType The mime type of the file.
   * @returns HTML string if convertible, undefined otherwise.
   */
  private static async convertToHtml(
    content: Buffer | string,
    fileName: string,
    mimeType: string
  ): Promise<string | undefined> {
    const extension = fileName.split(".").pop()?.toLowerCase();

    // First try to convert based on the mime type
    switch (mimeType) {
      case "text/html":
        return typeof content === "string" ? content : content.toString("utf8");
      case "application/msword":
        return this.confluenceToHtml(content);
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return this.docxToHtml(content);
      // Browsers report MHTML ("Save page as → Webpage, Single File") and .eml
      // inconsistently across these three mime types, so the extension is
      // used as a tie-breaker between the two archive kinds below.
      case "multipart/related":
      case "application/x-mimearchive":
        return extension === "eml"
          ? this.emlToHtml(content)
          : this.mhtmlToHtml(content);
      case "message/rfc822":
        return extension === "mhtml" || extension === "mht"
          ? this.mhtmlToHtml(content)
          : this.emlToHtml(content);
      default:
        break;
    }

    // Try to convert based on the file extension
    switch (extension) {
      case "htm":
      case "html":
        return typeof content === "string" ? content : content.toString("utf8");
      case "docx":
        return this.docxToHtml(content);
      case "mhtml":
      case "mht":
        return this.mhtmlToHtml(content);
      case "eml":
        return this.emlToHtml(content);
      default:
        return undefined;
    }
  }

  /**
   * Converts content to markdown for text-based formats.
   *
   * @param content The content of the file.
   * @param fileName The name of the file, including extension.
   * @param mimeType The mime type of the file.
   * @returns Markdown string.
   */
  private static async convertToMarkdown(
    content: Buffer | string,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    let markdown: string;

    switch (mimeType) {
      case "text/plain":
      case "text/markdown":
        markdown = this.bufferToString(content);
        break;
      case "text/csv":
      case "text/tab-separated-values":
        return this.csvToMarkdown(content);
      default: {
        const extension = fileName.split(".").pop()?.toLowerCase();
        switch (extension) {
          case "md":
          case "markdown":
          case "txt":
            markdown = this.bufferToString(content);
            break;
          case "csv":
          case "tsv":
            return this.csvToMarkdown(content);
          default:
            throw FileImportError(`File type ${mimeType} not supported`);
        }
      }
    }

    // Process frontmatter and convert it to a YAML codeblock
    return this.processFrontmatter(markdown);
  }

  /**
   * Convert a docx file to HTML using mammoth.
   *
   * @param content The docx file content as a Buffer.
   * @returns The HTML representation of the document.
   */
  private static async docxToHtml(content: Buffer | string): Promise<string> {
    if (content instanceof Buffer) {
      // Loaded lazily to keep mammoth off the startup path — only docx imports need it.
      const mammoth = (await import("mammoth")).default;
      const { value } = await traceFunction({ spanName: "convertToHtml" })(
        mammoth.convertToHtml
      )({
        buffer: content,
      });
      return value;
    }
    throw FileImportError("Unsupported Word file");
  }

  /** Maximum number of MIME archive parts that will be inlined as data URIs. */
  private static readonly MIME_ARCHIVE_MAX_INLINE_PARTS = 100;

  /** Maximum size of a single MIME archive part that will be inlined as a data URI. */
  private static readonly MIME_ARCHIVE_MAX_PART_BYTES = 15 * 1024 * 1024;

  /** Maximum combined size of MIME archive parts that will be inlined as data URIs. */
  private static readonly MIME_ARCHIVE_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

  /** Matches a well-formed mime type, e.g. `image/png`. */
  private static readonly MIME_TYPE_REGEX = /^[\w.+-]+\/[\w.+-]+$/;

  /**
   * Convert a Confluence Word export to HTML.
   *
   * @param content The Confluence Word export content.
   * @returns The HTML representation of the document.
   */
  private static async confluenceToHtml(
    content: Buffer | string
  ): Promise<string> {
    const text = this.bufferToString(content);

    // We're only supporting the output from Confluence here, regular Word documents should call
    // into the docxToHtml importer. See: https://jira.atlassian.com/browse/CONFSERVER-38237
    if (!text.includes("Content-Type: multipart/related")) {
      throw FileImportError("Unsupported Word file");
    }

    const { html } = await this.parseMimeArchive(text, {
      emptyMessage: "Unsupported Word file (No content found)",
    });

    return html;
  }

  /**
   * Convert an MHTML file (e.g. Chrome/Edge "Save page as → Webpage, Single
   * File") to HTML.
   *
   * @param content The MHTML file content.
   * @returns The HTML representation of the document.
   */
  private static async mhtmlToHtml(content: Buffer | string): Promise<string> {
    const { html } = await this.parseMimeArchive(this.bufferToString(content), {
      emptyMessage: "Unsupported MHTML file (No content found)",
    });

    return html;
  }

  /**
   * Convert an .eml email message to HTML. The `Subject` header, if present,
   * is inserted as a leading H1 so it is picked up as the document title by
   * the same leading-heading extraction used for every other format.
   *
   * @param content The .eml file content.
   * @returns The HTML representation of the message.
   */
  private static async emlToHtml(content: Buffer | string): Promise<string> {
    const { html, subject } = await this.parseMimeArchive(
      this.bufferToString(content),
      {
        allowTextFallback: true,
        emptyMessage: "Unsupported email file (No content found)",
      }
    );

    return subject ? `<h1>${escape(subject)}</h1>\n${html}` : html;
  }

  /**
   * Parse a MIME archive (`multipart/related`, `message/rfc822`, or similar)
   * with mailparser and resolve its HTML body, inlining referenced parts as
   * data URIs.
   *
   * Confluence's "Word" export and MHTML pages (Chrome/Edge "Save page as →
   * Webpage, Single File") are both, structurally, multi-part email messages,
   * so the same parser and inlining logic serves all of them.
   *
   * @param content The MIME archive content as a string.
   * @param options.allowTextFallback Whether to fall back to the plain text
   *   body (rendered as HTML) when no HTML part is present. Used for .eml,
   *   where a text-only email is common; MHTML/Word exports always have HTML.
   * @param options.emptyMessage The error message to throw when no usable
   *   body is found.
   * @returns The resolved HTML body and, if present, the message subject.
   */
  private static async parseMimeArchive(
    content: string,
    options: { allowTextFallback?: boolean; emptyMessage: string }
  ): Promise<{ html: string; subject?: string }> {
    // Confluence "Word" documents, MHTML pages, and .eml files are all just multi-part
    // email messages, so we can use mailparser to parse the content. Loaded lazily to
    // keep mailparser off the startup path — only these formats need it. `keepCidLinks`
    // is set so we can apply our own bounds when inlining referenced parts below, rather
    // than mailparser inlining every matching part unconditionally.
    const { simpleParser } = await import("mailparser");

    let parsed: ParsedMail;
    try {
      parsed = await simpleParser(content, { keepCidLinks: true });
    } catch (_err) {
      throw FileImportError(options.emptyMessage);
    }

    let html = parsed.html || undefined;
    if (!html && options.allowTextFallback) {
      html = parsed.textAsHtml || undefined;
    }
    if (!html) {
      throw FileImportError(options.emptyMessage);
    }

    return {
      html: this.inlineMimeArchiveParts(html, parsed.attachments),
      subject: parsed.subject,
    };
  }

  /**
   * Replace references to MIME archive parts within HTML with data URIs, so
   * the resulting document is self-contained. Parts are referenced either by
   * `Content-Location` (used by MHTML and Confluence exports) or by
   * `Content-ID` as a `cid:` URL (used by email). Inlining is bounded so a
   * hostile or merely enormous archive cannot blow up memory or the
   * resulting document.
   *
   * @param html The HTML body that may reference archive parts.
   * @param attachments The parsed MIME archive parts.
   * @returns The HTML with resolvable references replaced by data URIs.
   */
  private static inlineMimeArchiveParts(
    html: string,
    attachments: MailAttachment[]
  ): string {
    let inlinedParts = 0;
    let inlinedBytes = 0;

    for (const attachment of attachments) {
      if (inlinedParts >= this.MIME_ARCHIVE_MAX_INLINE_PARTS) {
        break;
      }
      if (
        attachment.content.length > this.MIME_ARCHIVE_MAX_PART_BYTES ||
        inlinedBytes + attachment.content.length >
          this.MIME_ARCHIVE_MAX_TOTAL_BYTES
      ) {
        continue;
      }

      const references = new Set<string>();
      const contentLocation = attachment.headers.get("content-location") as
        | string
        | undefined;
      if (contentLocation) {
        references.add(contentLocation);
        const basename = contentLocation.split("/").pop();
        if (basename) {
          references.add(basename);
        }
      }
      if (attachment.cid) {
        references.add(`cid:${attachment.cid}`);
      }

      // The content type comes from the archive's own headers, so anything that
      // isn't a well-formed mime type is discarded rather than interpolated.
      const contentType = this.MIME_TYPE_REGEX.test(attachment.contentType)
        ? attachment.contentType
        : "application/octet-stream";

      let replaced = false;
      for (const reference of references) {
        if (html.includes(reference)) {
          const dataUri = `data:${contentType};base64,${attachment.content.toString(
            "base64"
          )}`;
          html = html.split(reference).join(dataUri);
          replaced = true;
        }
      }

      if (replaced) {
        inlinedParts++;
        inlinedBytes += attachment.content.length;
      }
    }

    return html;
  }

  /**
   * Convert a CSV file to a markdown table.
   *
   * @param content The CSV file content.
   * @returns A markdown table representation.
   */
  private static async csvToMarkdown(
    content: Buffer | string
  ): Promise<string> {
    // Loaded lazily to keep @fast-csv off the startup path — only CSV imports need it.
    const { parse } = await import("@fast-csv/parse");

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

  /**
   * Convert a Buffer to a string.
   *
   * @param content The content as a Buffer or string.
   * @returns The content as a string.
   */
  private static bufferToString(content: Buffer | string): string {
    return typeof content === "string" ? content : content.toString("utf8");
  }

  /**
   * Parse and convert frontmatter to a YAML codeblock.
   *
   * @param content The markdown content that may contain frontmatter.
   * @returns The markdown content with frontmatter converted to a YAML codeblock.
   */
  private static processFrontmatter(content: string): string {
    // Frontmatter must start at the beginning of the document
    const frontmatterRegex = /^---\n([\s\S]*?)\n---(?:\n|$)/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return content;
    }

    const frontmatterContent = match[1];
    const remainingContent = content.slice(match[0].length);

    // Validate that the frontmatter is valid YAML
    try {
      yaml.load(frontmatterContent);
    } catch {
      // If it's not valid YAML, return content unchanged
      return content;
    }

    // Convert frontmatter to a YAML codeblock
    const codeBlockDelimiter = "```";
    const yamlCodeblock = `${codeBlockDelimiter}yaml\n${frontmatterContent}\n${codeBlockDelimiter}\n\n`;

    return yamlCodeblock + remainingContent;
  }

  /**
   * Parse image dimensions from a binary buffer. Supports PNG, JPEG, and GIF.
   *
   * @param buffer The image data.
   * @returns The width and height if parseable, otherwise undefined.
   */
  private static getImageDimensionsFromBuffer(
    buffer: Buffer
  ): { width: number; height: number } | undefined {
    try {
      // PNG: signature + IHDR chunk
      if (
        buffer.length >= 24 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        return {
          width: buffer.readUInt32BE(16),
          height: buffer.readUInt32BE(20),
        };
      }

      // GIF: signature + logical screen descriptor
      if (
        buffer.length >= 10 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46
      ) {
        return {
          width: buffer.readUInt16LE(6),
          height: buffer.readUInt16LE(8),
        };
      }

      // JPEG: scan for SOF marker (cap at 64 KB to bound work)
      if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        const scanLimit = Math.min(buffer.length, 65536);
        let offset = 2;
        while (offset + 1 < scanLimit) {
          if (buffer[offset] !== 0xff) {
            offset++;
            continue;
          }
          const marker = buffer[offset + 1];
          offset += 2;

          // Standalone markers without a payload
          if (
            marker === 0x00 ||
            marker === 0x01 ||
            (marker >= 0xd0 && marker <= 0xd9)
          ) {
            continue;
          }

          if (offset + 2 > scanLimit) {
            break;
          }
          const segmentLength = buffer.readUInt16BE(offset);

          // SOF markers contain the frame dimensions — check before
          // the advance guard since this returns immediately.
          if (
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf)
          ) {
            if (offset + 7 <= buffer.length) {
              return {
                height: buffer.readUInt16BE(offset + 3),
                width: buffer.readUInt16BE(offset + 5),
              };
            }
            break;
          }

          // Length includes itself and must be >= 2; bail on malformed data.
          if (segmentLength < 2 || offset + segmentLength > buffer.length) {
            break;
          }

          offset += segmentLength;
        }
      }
    } catch {
      // Return undefined if parsing fails
    }
    return undefined;
  }
}
