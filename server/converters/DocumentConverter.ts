import type { Node } from "prosemirror-model";
import { DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import { splitLeadingEmoji } from "@shared/utils/parseTitle";
import { schema, serializer } from "@server/editor";
import { FileImportError } from "@server/errors";
import { trace } from "@server/logging/tracing";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { BaseConverter } from "./BaseConverter";
import { HtmlPreprocessor } from "./HtmlPreprocessor";

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
 * Converts incoming files of various formats to structured documents. Each
 * format's implementation lives in its own converter alongside this file; this
 * class owns the pipeline they feed into — route, parse, lift the title and
 * icon, serialize.
 */
@trace()
export class DocumentConverter extends BaseConverter {
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
    let icon: string | undefined;
    if (extractTitle) {
      const headings = ProsemirrorHelper.getHeadings(doc);
      if (headings.length > 0 && headings[0].level === 1) {
        // An emoji leading the title becomes the document's icon, matching how
        // a title is written back out on export.
        const { emoji, rest } = splitLeadingEmoji(headings[0].title);
        title = rest;
        icon = emoji;
        doc = ProsemirrorHelper.removeFirstHeading(doc);
      }
    }

    // Only when the title supplied no icon is the body's leading emoji taken,
    // so that a document without a heading can still lead with one.
    if (!icon) {
      const { emoji, doc: docWithoutEmoji } =
        ProsemirrorHelper.extractEmojiFromStart(doc);
      icon = emoji;
      doc = docWithoutEmoji;
    }

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
    content = this.bufferToString(content);

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
    HtmlPreprocessor.preprocess(document);

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
        return this.bufferToString(content);
      case "application/msword":
        return (await this.mimeArchive()).confluenceToHtml(content);
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return (await this.docx()).toHtml(content);
      // Browsers report MHTML ("Save page as → Webpage, Single File") and .eml
      // inconsistently across these three mime types, so the extension is
      // used as a tie-breaker between the two archive kinds below.
      case "multipart/related":
      case "application/x-mimearchive": {
        const converter = await this.mimeArchive();
        return extension === "eml"
          ? converter.emlToHtml(content)
          : converter.mhtmlToHtml(content);
      }
      case "message/rfc822": {
        const converter = await this.mimeArchive();
        return extension === "mhtml" || extension === "mht"
          ? converter.mhtmlToHtml(content)
          : converter.emlToHtml(content);
      }
      default:
        break;
    }

    // Try to convert based on the file extension
    switch (extension) {
      case "htm":
      case "html":
        return this.bufferToString(content);
      case "docx":
        return (await this.docx()).toHtml(content);
      case "mhtml":
      case "mht":
        return (await this.mimeArchive()).mhtmlToHtml(content);
      case "eml":
        return (await this.mimeArchive()).emlToHtml(content);
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
        return (await this.csv()).toMarkdown(content);
      case "application/pdf":
        return (await this.pdf()).toMarkdown(content);
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
            return (await this.csv()).toMarkdown(content);
          case "textpack":
            return (await this.textPack()).toMarkdown(content);
          case "pdf":
            return (await this.pdf()).toMarkdown(content);
          default:
            throw FileImportError(`File type ${mimeType} not supported`);
        }
      }
    }

    // Process frontmatter and convert it to a YAML codeblock
    return this.processFrontmatter(markdown);
  }

  /**
   * Converters are loaded on demand so that the dependencies of a format —
   * jsdom, mammoth, mailparser, fast-csv, yauzl, pdf-inspector — stay off the server startup
   * path, and are only paid for by an import that actually needs them.
   */
  private static async docx() {
    return (await import("./DocxConverter")).DocxConverter;
  }

  private static async mimeArchive() {
    return (await import("./MimeArchiveConverter")).MimeArchiveConverter;
  }

  private static async csv() {
    return (await import("./CsvConverter")).CsvConverter;
  }

  private static async textPack() {
    return (await import("./TextPackConverter")).TextPackConverter;
  }

  private static async pdf() {
    return (await import("./PdfConverter")).PdfConverter;
  }
}
