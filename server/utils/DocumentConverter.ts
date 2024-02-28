import escapeRegExp from "lodash/escapeRegExp";
import { simpleParser } from "mailparser";
import mammoth from "mammoth";
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
      default:
        break;
    }

    // If the mime type doesn't work, try to convert based on the file extension.
    const extension = fileName.split(".").pop();
    switch (extension) {
      case "docx":
        return this.docXToMarkdown(content);
      case "html":
        return this.htmlToMarkdown(content);
      case "md":
      case "markdown":
        return this.fileToMarkdown(content);
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
    if (content instanceof Buffer) {
      content = content.toString("utf8");
    }

    return turndownService.turndown(content);
  }

  public static async fileToMarkdown(content: Buffer | string) {
    if (content instanceof Buffer) {
      content = content.toString("utf8");
    }
    return content;
  }

  public static async confluenceToMarkdown(value: Buffer | string) {
    if (value instanceof Buffer) {
      value = value.toString("utf8");
    }

    // We're only supporting the output from Confluence here, regular Word documents should call
    // into the docxToMarkdown importer. See: https://jira.atlassian.com/browse/CONFSERVER-38237
    if (!value.includes("Content-Type: multipart/related")) {
      throw FileImportError("Unsupported Word file");
    }

    // Confluence "Word" documents are actually just multi-part email messages, so we can use
    // mailparser to parse the content.
    const parsed = await simpleParser(value);
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
}
