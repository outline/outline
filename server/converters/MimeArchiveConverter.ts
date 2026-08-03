import { escape } from "es-toolkit/compat";
import type { Attachment as MailAttachment, ParsedMail } from "mailparser";
import { simpleParser } from "mailparser";
import { FileImportError } from "@server/errors";
import { BaseConverter } from "./BaseConverter";

/**
 * Converts MIME archives to HTML. Confluence's "Word" export, MHTML pages
 * (Chrome/Edge "Save page as → Webpage, Single File") and .eml messages are
 * all, structurally, multi-part email messages, so one parser serves them all.
 */
export class MimeArchiveConverter extends BaseConverter {
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
  public static async confluenceToHtml(
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
  public static async mhtmlToHtml(content: Buffer | string): Promise<string> {
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
  public static async emlToHtml(content: Buffer | string): Promise<string> {
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
    // email messages, so we can use mailparser to parse the content. `keepCidLinks` is
    // set so we can apply our own bounds when inlining referenced parts below, rather
    // than mailparser inlining every matching part unconditionally.
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
}
