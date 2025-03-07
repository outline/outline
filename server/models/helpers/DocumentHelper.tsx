import { JSDOM } from "jsdom";
import { Node } from "prosemirror-model";
import ukkonen from "ukkonen";
import { updateYFragment, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import textBetween from "@shared/editor/lib/textBetween";
import { getTextSerializers } from "@shared/editor/lib/textSerializers";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { IconType, ProsemirrorData } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import { parser, serializer, schema } from "@server/editor";
import { addTags } from "@server/logging/tracer";
import { trace } from "@server/logging/tracing";
import { Collection, Document, Revision } from "@server/models";
import diff from "@server/utils/diff";
import { MentionAttrs, ProsemirrorHelper } from "./ProsemirrorHelper";
import { TextHelper } from "./TextHelper";

type HTMLOptions = {
  /** Whether to include the document title in the generated HTML (defaults to true) */
  includeTitle?: boolean;
  /** Whether to include style tags in the generated HTML (defaults to true) */
  includeStyles?: boolean;
  /** Whether to include the Mermaid script in the generated HTML (defaults to false) */
  includeMermaid?: boolean;
  /** Whether to include styles to center diff (defaults to true) */
  centered?: boolean;
  /**
   * Whether to replace attachment urls with pre-signed versions. If set to a
   * number then the urls will be signed for that many seconds. (defaults to false)
   */
  signedUrls?: boolean | number;
  /** The base URL to use for relative links */
  baseUrl?: string;
};

@trace()
export class DocumentHelper {
  /**
   * Returns the document as a Prosemirror Node. This method uses the derived content if available
   * then the collaborative state, otherwise it falls back to Markdown.
   *
   * @param document The document or revision to convert
   * @returns The document content as a Prosemirror Node
   */
  static toProsemirror(
    document: Document | Revision | Collection | ProsemirrorData
  ) {
    if ("type" in document && document.type === "doc") {
      return Node.fromJSON(schema, document);
    }
    if ("content" in document && document.content) {
      return Node.fromJSON(schema, document.content);
    }
    if ("state" in document && document.state) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, document.state);
      return Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default"));
    }

    const text =
      document instanceof Collection ? document.description : document.text;
    return parser.parse(text ?? "") || Node.fromJSON(schema, {});
  }

  /**
   * Returns the document as a plain JSON object. This method uses the derived content if available
   * then the collaborative state, otherwise it falls back to Markdown.
   *
   * @param document The document or revision to convert
   * @param options Options for the conversion
   * @returns The document content as a plain JSON object
   */
  static async toJSON(
    document: Document | Revision | Collection,
    options?: {
      /** The team context */
      teamId?: string;
      /** Whether to sign attachment urls, and if so for how many seconds is the signature valid */
      signedUrls?: number;
      /** Marks to remove from the document */
      removeMarks?: string[];
      /** The base path to use for internal links (will replace /doc/) */
      internalUrlBase?: string;
    }
  ): Promise<ProsemirrorData> {
    let doc: Node | null;
    let data;

    if ("content" in document && document.content) {
      // Optimized path for documents with content available and no transformation required.
      if (
        !options?.removeMarks &&
        !options?.signedUrls &&
        !options?.internalUrlBase
      ) {
        return document.content;
      }
      doc = Node.fromJSON(schema, document.content);
    } else if ("state" in document && document.state) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, document.state);
      doc = Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default"));
    } else if (document instanceof Collection) {
      doc = parser.parse(document.description ?? "");
    } else {
      doc = parser.parse(document.text);
    }

    if (doc && options?.signedUrls && options?.teamId) {
      data = await ProsemirrorHelper.signAttachmentUrls(
        doc,
        options.teamId,
        options.signedUrls
      );
    } else {
      data = doc?.toJSON() ?? {};
    }

    if (options?.internalUrlBase) {
      data = ProsemirrorHelper.replaceInternalUrls(
        data,
        options.internalUrlBase
      );
    }
    if (options?.removeMarks) {
      data = ProsemirrorHelper.removeMarks(data, options.removeMarks);
    }

    return data;
  }

  /**
   * Returns the document as plain text. This method uses the
   * collaborative state if available, otherwise it falls back to Markdown.
   *
   * @param document The document or revision or prosemirror data to convert
   * @returns The document content as plain text without formatting.
   */
  static toPlainText(document: Document | Revision | ProsemirrorData) {
    const node = DocumentHelper.toProsemirror(document);

    return textBetween(node, 0, node.content.size, this.textSerializers);
  }

  /**
   * Returns the document as Markdown. This is a lossy conversion and should only be used for export.
   *
   * @param document The document or revision to convert
   * @param options Options for the conversion
   * @returns The document title and content as a Markdown string
   */
  static toMarkdown(
    document: Document | Revision | Collection | ProsemirrorData,
    options?: {
      /** Whether to include the document title (default: true) */
      includeTitle?: boolean;
    }
  ) {
    const text = serializer
      .serialize(DocumentHelper.toProsemirror(document))
      .replace(/(^|\n)\\(\n|$)/g, "\n\n")
      .replace(/“/g, '"')
      .replace(/”/g, '"')
      .replace(/‘/g, "'")
      .replace(/’/g, "'")
      .trim();

    if (document instanceof Collection) {
      return text;
    }

    if (
      (document instanceof Document || document instanceof Revision) &&
      options?.includeTitle !== false
    ) {
      const iconType = determineIconType(document.icon);

      const title = `${iconType === IconType.Emoji ? document.icon + " " : ""}${
        document.title
      }`;

      return `# ${title}\n\n${text}`;
    }

    return text;
  }

  /**
   * Returns the document as plain HTML. This is a lossy conversion and should only be used for export.
   *
   * @param document The document or revision to convert
   * @param options Options for the HTML output
   * @returns The document title and content as a HTML string
   */
  static async toHTML(document: Document | Revision, options?: HTMLOptions) {
    const node = DocumentHelper.toProsemirror(document);
    let output = ProsemirrorHelper.toHTML(node, {
      title: options?.includeTitle !== false ? document.title : undefined,
      includeStyles: options?.includeStyles,
      includeMermaid: options?.includeMermaid,
      centered: options?.centered,
      baseUrl: options?.baseUrl,
    });

    addTags({
      documentId: document.id,
      options,
    });

    if (options?.signedUrls) {
      const teamId =
        document instanceof Document
          ? document.teamId
          : (await document.$get("document"))?.teamId;

      if (!teamId) {
        return output;
      }

      output = await TextHelper.attachmentsToSignedUrls(
        output,
        teamId,
        typeof options.signedUrls === "number" ? options.signedUrls : undefined
      );
    }

    return output;
  }

  /**
   * Parse a list of mentions contained in a document or revision
   *
   * @param document Document or Revision
   * @param options Attributes to use for filtering mentions
   * @returns An array of mentions in passed document or revision
   */
  static parseMentions(
    document: Document | Revision,
    options?: Partial<MentionAttrs>
  ) {
    const node = DocumentHelper.toProsemirror(document);
    return ProsemirrorHelper.parseMentions(node, options);
  }

  /**
   * Parse a list of document IDs contained in a document or revision
   *
   * @param document Document or Revision
   * @returns An array of identifiers in passed document or revision
   */
  static parseDocumentIds(document: Document | Revision) {
    const node = DocumentHelper.toProsemirror(document);
    return ProsemirrorHelper.parseDocumentIds(node);
  }

  /**
   * Generates a HTML diff between documents or revisions.
   *
   * @param before The before document
   * @param after The after document
   * @param options Options passed to HTML generation
   * @returns The diff as a HTML string
   */
  static async diff(
    before: Document | Revision | null,
    after: Revision,
    { signedUrls, ...options }: HTMLOptions = {}
  ) {
    addTags({
      beforeId: before?.id,
      documentId: after.documentId,
      options,
    });

    if (!before) {
      return await DocumentHelper.toHTML(after, { ...options, signedUrls });
    }

    const beforeHTML = await DocumentHelper.toHTML(before, options);
    const afterHTML = await DocumentHelper.toHTML(after, options);
    const beforeDOM = new JSDOM(beforeHTML);
    const afterDOM = new JSDOM(afterHTML);

    // Extract the content from the article tag and diff the HTML, we don't
    // care about the surrounding layout and stylesheets.
    let diffedContentAsHTML = diff(
      beforeDOM.window.document.getElementsByTagName("article")[0].innerHTML,
      afterDOM.window.document.getElementsByTagName("article")[0].innerHTML
    );

    // Sign only the URLS in the diffed content
    if (signedUrls) {
      const teamId =
        before instanceof Document
          ? before.teamId
          : (await before.$get("document"))?.teamId;

      if (teamId) {
        diffedContentAsHTML = await TextHelper.attachmentsToSignedUrls(
          diffedContentAsHTML,
          teamId,
          typeof signedUrls === "number" ? signedUrls : undefined
        );
      }
    }

    // Inject the diffed content into the original document with styling and
    // serialize back to a string.
    const article = beforeDOM.window.document.querySelector("article");
    if (article) {
      article.innerHTML = diffedContentAsHTML;
    }
    return beforeDOM.serialize();
  }

  /**
   * Generates a compact HTML diff between documents or revisions, the
   * diff is reduced up to show only the parts of the document that changed and
   * the immediate context. Breaks in the diff are denoted with
   * "div.diff-context-break" nodes.
   *
   * @param before The before document
   * @param after The after document
   * @param options Options passed to HTML generation
   * @returns The diff as a HTML string
   */
  static async toEmailDiff(
    before: Document | Revision | null,
    after: Revision,
    options?: HTMLOptions
  ) {
    if (!before) {
      return "";
    }

    const html = await DocumentHelper.diff(before, after, options);
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const containsDiffElement = (node: Element | null) =>
      node && node.innerHTML.includes("data-operation-index");

    // The diffing lib isn't able to catch all changes currently, e.g. changing
    // the type of a mark will result in an empty diff.
    // see: https://github.com/tnwinc/htmldiff.js/issues/10
    if (!containsDiffElement(doc.querySelector("#content"))) {
      return;
    }

    // We use querySelectorAll to get a static NodeList as we'll be modifying
    // it as we iterate, rather than getting content.childNodes.
    const contents = doc.querySelectorAll("#content > *");
    let previousNodeRemoved = false;
    let previousDiffClipped = false;

    const br = doc.createElement("div");
    br.innerHTML = "…";
    br.className = "diff-context-break";

    for (const childNode of contents) {
      // If the block node contains a diff tag then we want to keep it
      if (containsDiffElement(childNode as Element)) {
        if (previousNodeRemoved && previousDiffClipped) {
          childNode.parentElement?.insertBefore(br.cloneNode(true), childNode);
        }
        previousNodeRemoved = false;
        previousDiffClipped = true;

        // Special case for largetables, as this block can get very large we
        // want to clip it to only the changed rows and surrounding context.
        if (childNode.classList.contains(EditorStyleHelper.table)) {
          const rows = childNode.querySelectorAll("tr");
          if (rows.length < 3) {
            continue;
          }

          let previousRowRemoved = false;
          let previousRowDiffClipped = false;

          for (const row of rows) {
            if (containsDiffElement(row)) {
              const cells = row.querySelectorAll("td");
              if (previousRowRemoved && previousRowDiffClipped) {
                const tr = doc.createElement("tr");
                const br = doc.createElement("td");
                br.colSpan = cells.length;
                br.innerHTML = "…";
                br.className = "diff-context-break";
                tr.appendChild(br);
                childNode.parentElement?.insertBefore(tr, childNode);
              }
              previousRowRemoved = false;
              previousRowDiffClipped = true;
              continue;
            }

            if (containsDiffElement(row.nextElementSibling)) {
              previousRowRemoved = false;
              continue;
            }

            if (containsDiffElement(row.previousElementSibling)) {
              previousRowRemoved = false;
              continue;
            }

            previousRowRemoved = true;
            row.remove();
          }
        }

        continue;
      }

      // If the block node does not contain a diff tag and the previous
      // block node did not contain a diff tag then remove the previous.
      if (
        childNode.nodeName === "P" &&
        childNode.textContent &&
        childNode.nextElementSibling?.nodeName === "P" &&
        containsDiffElement(childNode.nextElementSibling)
      ) {
        if (previousDiffClipped) {
          childNode.parentElement?.insertBefore(br.cloneNode(true), childNode);
        }
        previousNodeRemoved = false;
        continue;
      }
      if (
        childNode.nodeName === "P" &&
        childNode.textContent &&
        childNode.previousElementSibling?.nodeName === "P" &&
        containsDiffElement(childNode.previousElementSibling)
      ) {
        previousNodeRemoved = false;
        continue;
      }
      previousNodeRemoved = true;
      childNode.remove();
    }

    const head = doc.querySelector("head");
    const body = doc.querySelector("body");
    return `${head?.innerHTML} ${body?.innerHTML}`;
  }

  /**
   * Applies the given Markdown to the document, this essentially creates a
   * single change in the collaborative state that makes all the edits to get
   * to the provided Markdown.
   *
   * @param document The document to apply the changes to
   * @param text The markdown to apply
   * @param append If true appends the markdown instead of replacing existing
   * content
   * @returns The document
   */
  static applyMarkdownToDocument(
    document: Document,
    text: string,
    append = false
  ) {
    document.text = append ? document.text + text : text;
    const doc = parser.parse(document.text);
    document.content = doc.toJSON();

    if (document.state) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, document.state);
      const type = ydoc.get("default", Y.XmlFragment) as Y.XmlFragment;

      if (!type.doc) {
        throw new Error("type.doc not found");
      }

      // apply new document to existing ydoc
      updateYFragment(type.doc, type, doc, new Map());

      const state = Y.encodeStateAsUpdate(ydoc);

      document.state = Buffer.from(state);
      document.changed("state", true);
    }

    return document;
  }

  /**
   * Compares two documents or revisions and returns whether the text differs by more than the threshold.
   *
   * @param document The document to compare
   * @param other The other document to compare
   * @param threshold The threshold for the change in characters
   * @returns True if the text differs by more than the threshold
   */
  public static isChangeOverThreshold(
    before: Document | Revision | null,
    after: Document | Revision | null,
    threshold: number
  ) {
    if (!before || !after) {
      return false;
    }

    const first = before.title + this.toPlainText(before);
    const second = after.title + this.toPlainText(after);
    const distance = ukkonen(first, second, threshold + 1);
    return distance > threshold;
  }

  private static textSerializers = getTextSerializers(schema);
}
