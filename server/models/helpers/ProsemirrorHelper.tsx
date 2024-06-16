import { prosemirrorToYDoc } from "@getoutline/y-prosemirror";
import { JSDOM } from "jsdom";
import compact from "lodash/compact";
import flatten from "lodash/flatten";
import uniq from "lodash/uniq";
import { Node, DOMSerializer, Fragment, Mark } from "prosemirror-model";
import * as React from "react";
import { renderToString } from "react-dom/server";
import styled, { ServerStyleSheet, ThemeProvider } from "styled-components";
import * as Y from "yjs";
import EditorContainer from "@shared/editor/components/Styles";
import embeds from "@shared/editor/embeds";
import GlobalStyles from "@shared/styles/globals";
import light from "@shared/styles/theme";
import { ProsemirrorData } from "@shared/types";
import { attachmentRedirectRegex } from "@shared/utils/ProsemirrorHelper";
import { isRTL } from "@shared/utils/rtl";
import { schema, parser } from "@server/editor";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Attachment from "@server/models/Attachment";
import User from "@server/models/User";
import FileStorage from "@server/storage/files";
import { TextHelper } from "./TextHelper";

export type HTMLOptions = {
  /** A title, if it should be included */
  title?: string;
  /** Whether to include style tags in the generated HTML (defaults to true) */
  includeStyles?: boolean;
  /** Whether to include mermaidjs scripts in the generated HTML (defaults to false) */
  includeMermaid?: boolean;
  /** Whether to include styles to center diff (defaults to true) */
  centered?: boolean;
  /** The base URL to use for relative links */
  baseUrl?: string;
};

type MentionAttrs = {
  type: string;
  label: string;
  modelId: string;
  actorId: string | undefined;
  id: string;
};

@trace()
export class ProsemirrorHelper {
  /**
   * Returns the input text as a Y.Doc.
   *
   * @param markdown The text to parse
   * @returns The content as a Y.Doc.
   */
  static toYDoc(input: string | ProsemirrorData, fieldName = "default"): Y.Doc {
    if (typeof input === "object") {
      return prosemirrorToYDoc(
        ProsemirrorHelper.toProsemirror(input),
        fieldName
      );
    }

    let node = parser.parse(input);

    // in the editor embeds are created at runtime by converting links into
    // embeds where they match.Because we're converting to a CRDT structure on
    //  the server we need to mimic this behavior.
    function urlsToEmbeds(node: Node): Node {
      if (node.type.name === "paragraph") {
        // @ts-expect-error content
        for (const textNode of node.content.content) {
          for (const embed of embeds) {
            if (
              textNode.text &&
              textNode.marks.some(
                (m: Mark) =>
                  m.type.name === "link" && m.attrs.href === textNode.text
              ) &&
              embed.matcher(textNode.text)
            ) {
              return schema.nodes.embed.createAndFill({
                href: textNode.text,
              }) as Node;
            }
          }
        }
      }

      if (node.content) {
        const contentAsArray =
          node.content instanceof Fragment
            ? // @ts-expect-error content
              node.content.content
            : node.content;
        // @ts-expect-error content
        node.content = Fragment.fromArray(contentAsArray.map(urlsToEmbeds));
      }

      return node;
    }

    if (node) {
      node = urlsToEmbeds(node);
    }

    return node ? prosemirrorToYDoc(node, fieldName) : new Y.Doc();
  }

  /**
   * Returns the input Y.Doc encoded as a YJS state update.
   *
   * @param ydoc The Y.Doc to encode
   * @returns The content as a YJS state update
   */
  static toState(ydoc: Y.Doc) {
    return Buffer.from(Y.encodeStateAsUpdate(ydoc));
  }

  /**
   * Converts a plain object into a Prosemirror Node.
   *
   * @param data The object to parse
   * @returns The content as a Prosemirror Node
   */
  static toProsemirror(data: ProsemirrorData) {
    return Node.fromJSON(schema, data);
  }

  /**
   * Returns an array of attributes of all mentions in the node.
   *
   * @param node The node to parse mentions from
   * @returns An array of mention attributes
   */
  static parseMentions(doc: Node) {
    const mentions: MentionAttrs[] = [];

    doc.descendants((node: Node) => {
      if (
        node.type.name === "mention" &&
        !mentions.some((m) => m.id === node.attrs.id)
      ) {
        mentions.push(node.attrs as MentionAttrs);
        return false;
      }

      if (!node.content.size) {
        return false;
      }

      return true;
    });

    return mentions;
  }

  /**
   * Removes all marks from the node that match the given types.
   *
   * @param data The ProsemirrorData object to remove marks from
   * @param marks The mark types to remove
   * @returns The content with marks removed
   */
  static removeMarks(data: ProsemirrorData, marks: string[]) {
    function removeMarksInner(node: ProsemirrorData) {
      if (node.marks) {
        node.marks = node.marks.filter((mark) => !marks.includes(mark.type));
      }
      if (node.content) {
        node.content.forEach(removeMarksInner);
      }
      return node;
    }
    return removeMarksInner(data);
  }

  /**
   * Replaces all template variables in the node.
   *
   * @param data The ProsemirrorData object to replace variables in
   * @param user The user to use for replacing variables
   * @returns The content with variables replaced
   */
  static replaceTemplateVariables(data: ProsemirrorData, user: User) {
    function replace(node: ProsemirrorData) {
      if (node.type === "text" && node.text) {
        node.text = TextHelper.replaceTemplateVariables(node.text, user);
      }

      if (node.content) {
        node.content.forEach(replace);
      }

      return node;
    }

    return replace(data);
  }

  /**
   * Returns the document as a plain JSON object with attachment URLs signed.
   *
   * @param node The node to convert to JSON
   * @param teamId The team ID to use for signing
   * @param expiresIn The number of seconds until the signed URL expires
   * @returns The content as a JSON object
   */
  static async signAttachmentUrls(doc: Node, teamId: string, expiresIn = 60) {
    const attachmentIds = ProsemirrorHelper.parseAttachmentIds(doc);
    const attachments = await Attachment.findAll({
      where: {
        id: attachmentIds,
        teamId,
      },
    });

    const mapping: Record<string, string> = {};

    await Promise.all(
      attachments.map(async (attachment) => {
        const signedUrl = await FileStorage.getSignedUrl(
          attachment.key,
          expiresIn
        );
        mapping[attachment.redirectUrl] = signedUrl;
      })
    );

    const json = doc.toJSON() as ProsemirrorData;

    function getMapping(href: string) {
      let relativeHref;

      try {
        const url = new URL(href);
        relativeHref = url.toString().substring(url.origin.length);
      } catch {
        // Noop: Invalid url.
      }

      for (const originalUrl of Object.keys(mapping)) {
        if (
          href.startsWith(originalUrl) ||
          relativeHref?.startsWith(originalUrl)
        ) {
          return mapping[originalUrl];
        }
      }

      return href;
    }

    function replaceAttachmentUrls(node: ProsemirrorData) {
      if (node.attrs?.src) {
        node.attrs.src = getMapping(String(node.attrs.src));
      } else if (node.attrs?.href) {
        node.attrs.href = getMapping(String(node.attrs.href));
      } else if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.attrs?.href) {
            mark.attrs.href = getMapping(String(mark.attrs.href));
          }
        });
      }

      if (node.content) {
        node.content.forEach(replaceAttachmentUrls);
      }

      return node;
    }

    return replaceAttachmentUrls(json);
  }

  /**
   * Returns an array of attachment IDs in the node.
   *
   * @param node The node to parse attachments from
   * @returns An array of attachment IDs
   */
  static parseAttachmentIds(doc: Node) {
    const urls: string[] = [];

    doc.descendants((node) => {
      node.marks.forEach((mark) => {
        if (mark.type.name === "link") {
          urls.push(mark.attrs.href);
        }
      });
      if (["image", "video"].includes(node.type.name)) {
        urls.push(node.attrs.src);
      }
      if (node.type.name === "attachment") {
        urls.push(node.attrs.href);
      }
    });

    return uniq(
      compact(
        flatten(
          urls.map((url) =>
            [...url.matchAll(attachmentRedirectRegex)].map(
              (match) => match.groups?.id
            )
          )
        )
      )
    );
  }

  /**
   * Returns the node as HTML. This is a lossy conversion and should only be used
   * for export.
   *
   * @param node The node to convert to HTML
   * @param options Options for the HTML output
   * @returns The content as a HTML string
   */
  static toHTML(node: Node, options?: HTMLOptions) {
    const sheet = new ServerStyleSheet();
    let html = "";
    let styleTags = "";

    const Centered = options?.centered
      ? styled.article`
          max-width: 46em;
          margin: 0 auto;
          padding: 0 1em;
        `
      : "article";

    const rtl = isRTL(node.textContent);
    const content = <div id="content" className="ProseMirror" />;
    const children = (
      <>
        {options?.title && <h1 dir={rtl ? "rtl" : "ltr"}>{options.title}</h1>}
        {options?.includeStyles !== false ? (
          <EditorContainer dir={rtl ? "rtl" : "ltr"} rtl={rtl} staticHTML>
            {content}
          </EditorContainer>
        ) : (
          content
        )}
      </>
    );

    // First render the containing document which has all the editor styles,
    // global styles, layout and title.
    try {
      html = renderToString(
        sheet.collectStyles(
          <ThemeProvider theme={light}>
            <>
              {options?.includeStyles === false ? (
                <article>{children}</article>
              ) : (
                <>
                  <GlobalStyles staticHTML />
                  <Centered>{children}</Centered>
                </>
              )}
            </>
          </ThemeProvider>
        )
      );
      styleTags = sheet.getStyleTags();
    } catch (error) {
      Logger.error("Failed to render styles on node HTML conversion", error);
    } finally {
      sheet.seal();
    }

    // Render the Prosemirror document using virtual DOM and serialize the
    // result to a string
    const dom = new JSDOM(
      `<!DOCTYPE html>${
        options?.includeStyles === false ? "" : styleTags
      }${html}`
    );
    const doc = dom.window.document;
    const target = doc.getElementById("content");

    DOMSerializer.fromSchema(schema).serializeFragment(
      node.content,
      {
        document: doc,
      },
      // @ts-expect-error incorrect library type, third argument is target node
      target
    );

    // Convert relative urls to absolute
    if (options?.baseUrl) {
      const elements = doc.querySelectorAll("a[href]");
      for (const el of elements) {
        if ("href" in el && (el.href as string).startsWith("/")) {
          el.href = new URL(el.href as string, options.baseUrl).toString();
        }
      }
    }

    // Inject mermaidjs scripts if the document contains mermaid diagrams
    if (options?.includeMermaid) {
      const mermaidElements = dom.window.document.querySelectorAll(
        `[data-language="mermaidjs"] pre code`
      );

      // Unwrap <pre> tags to enable Mermaid script to correctly render inner content
      for (const el of mermaidElements) {
        const parent = el.parentNode as HTMLElement;
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
          }
          parent.removeChild(el);
          parent.setAttribute("class", "mermaid");
        }
      }

      const element = dom.window.document.createElement("script");
      element.setAttribute("type", "module");

      // Inject Mermaid script
      if (mermaidElements.length) {
        element.innerHTML = `
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@9/dist/mermaid.esm.min.mjs';
          mermaid.initialize({
            startOnLoad: true,
            fontFamily: "inherit",
          });
          window.status = "ready";
        `;
      } else {
        element.innerHTML = `
          window.status = "ready";
        `;
      }

      dom.window.document.body.appendChild(element);
    }

    return dom.serialize();
  }
}
