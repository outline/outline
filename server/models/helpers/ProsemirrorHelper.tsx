import emojiRegex from "emoji-regex";
import { JSDOM } from "jsdom";
import chunk from "lodash/chunk";
import compact from "lodash/compact";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import flatten from "lodash/flatten";
import isMatch from "lodash/isMatch";
import uniq from "lodash/uniq";
import { Node, Fragment } from "prosemirror-model";
import { renderToString } from "react-dom/server";
import styled, { ServerStyleSheet, ThemeProvider } from "styled-components";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import Diff from "@shared/editor/extensions/Diff";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import type { ExtendedChange } from "@shared/editor/lib/ChangesetHelper";
import EditorContainer from "@shared/editor/components/Styles";
import GlobalStyles from "@shared/styles/globals";
import light from "@shared/styles/theme";
import type { ProsemirrorData, UnfurlResponse } from "@shared/types";
import { AttachmentPreset, MentionType } from "@shared/types";
import {
  attachmentRedirectRegex,
  ProsemirrorHelper as SharedProsemirrorHelper,
} from "@shared/utils/ProsemirrorHelper";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { isRTL } from "@shared/utils/rtl";
import { isInternalUrl } from "@shared/utils/urls";
import attachmentCreator from "@server/commands/attachmentCreator";
import { plugins, schema, parser } from "@server/editor";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Attachment from "@server/models/Attachment";
import User from "@server/models/User";
import FileStorage from "@server/storage/files";
import type { APIContext } from "@server/types";

export type HTMLOptions = {
  /** A title, if it should be included */
  title?: string;
  /** Whether to include style tags in the generated HTML (defaults to true) */
  includeStyles?: boolean;
  /** Whether to include mermaidjs scripts in the generated HTML (defaults to false) */
  includeMermaid?: boolean;
  /** Whether to include head tags in the generated HTML (defaults to true) */
  includeHead?: boolean;
  /** Whether to include styles to center diff (defaults to true) */
  centered?: boolean;
  /** The base URL to use for relative links */
  baseUrl?: string;
  /** Changes to highlight in the document */
  changes?: readonly ExtendedChange[];
};

export type MentionAttrs = {
  type: MentionType;
  label: string;
  modelId: string;
  actorId: string | undefined;
  id: string;
  href?: string;
  unfurl?: UnfurlResponse[keyof UnfurlResponse];
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

    const node = parser.parse(input);
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
   * Converts a plain object or Markdown string into a Prosemirror Node.
   *
   * @param data The ProsemirrorData object or string to parse.
   * @returns The content as a Prosemirror Node
   */
  static toProsemirror(data: ProsemirrorData | string) {
    if (typeof data === "string") {
      return parser.parse(data);
    }
    return Node.fromJSON(schema, data);
  }

  /**
   * Returns an array of attributes of all mentions in the node.
   *
   * @param node The node to parse mentions from
   * @param options Attributes to use for filtering mentions
   * @returns An array of mention attributes
   */
  static parseMentions(doc: Node, options?: Partial<MentionAttrs>) {
    const mentions: MentionAttrs[] = [];

    const isApplicableNode = (node: Node) => {
      if (node.type.name !== "mention") {
        return false;
      }

      if (
        (options?.type && options.type !== node.attrs.type) ||
        (options?.modelId && options.modelId !== node.attrs.modelId)
      ) {
        return false;
      }

      return !mentions.some((m) => m.id === node.attrs.id);
    };

    doc.descendants((node: Node) => {
      if (isApplicableNode(node)) {
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
   * Returns an array of document IDs referenced through links or mentions in the node.
   *
   * @param node The node to parse document IDs from
   * @returns An array of document IDs
   */
  static parseDocumentIds(doc: Node) {
    const identifiers: string[] = [];

    doc.descendants((node: Node) => {
      if (
        node.type.name === "mention" &&
        node.attrs.type === MentionType.Document &&
        !identifiers.includes(node.attrs.modelId)
      ) {
        identifiers.push(node.attrs.modelId);
        return true;
      }

      if (node.type.name === "text") {
        // get marks for text nodes
        node.marks.forEach((mark) => {
          // any of the marks identifiers?
          if (mark.type.name === "link") {
            const slug = parseDocumentSlug(mark.attrs.href);

            // don't return the same link more than once
            if (slug && !identifiers.includes(slug)) {
              identifiers.push(slug);
            }
          }
        });
      }

      if (!node.content.size) {
        return false;
      }

      return true;
    });

    return identifiers;
  }

  /**
   * Find the nearest ancestor block node which contains the mention.
   *
   * @param doc The top-level doc node of a document / revision.
   * @param mention The mention for which the ancestor node is needed.
   * @returns A new top-level doc node with the ancestor node as the only child.
   */
  static getNodeForMentionEmail(doc: Node, mention: MentionAttrs) {
    let blockNode: Node | undefined;
    const potentialBlockNodes = [
      "table",
      "checkbox_list",
      "heading",
      "paragraph",
    ];

    const isNodeContainingMention = (node: Node) => {
      let foundMention = false;

      node.descendants((childNode: Node) => {
        if (
          childNode.type.name === "mention" &&
          isMatch(childNode.attrs, mention)
        ) {
          foundMention = true;
          return false;
        }

        // No need to traverse other descendants once we find the mention.
        if (foundMention) {
          return false;
        }

        return true;
      });

      return foundMention;
    };

    doc.descendants((node: Node) => {
      // No need to traverse other descendants once we find the containing block node.
      if (blockNode) {
        return false;
      }

      if (potentialBlockNodes.includes(node.type.name)) {
        if (isNodeContainingMention(node)) {
          blockNode = node;
        }
        return false;
      }

      return true;
    });

    // Use the containing block node to maintain structure during serialization.
    // Minify to include mentioned child only.
    if (blockNode && !["heading", "paragraph"].includes(blockNode.type.name)) {
      const children: Node[] = [];

      blockNode.forEach((child: Node) => {
        if (isNodeContainingMention(child)) {
          children.push(child);
        }
      });

      blockNode = blockNode.copy(Fragment.fromArray(children));
    }

    // Return a new top-level "doc" node to maintain structure during serialization.
    return blockNode ? doc.copy(Fragment.fromArray([blockNode])) : undefined;
  }

  /**
   * Removes all marks from the node that match the given types.
   *
   * @param data The ProsemirrorData object to remove marks from
   * @param marks The mark types to remove
   * @returns The content with marks removed
   */
  static removeMarks(doc: Node | ProsemirrorData, marks: string[]) {
    const json = "toJSON" in doc ? (doc.toJSON() as ProsemirrorData) : doc;

    function removeMarksInner(node: ProsemirrorData) {
      if (node.marks) {
        node.marks = node.marks.filter((mark) => !marks.includes(mark.type));
      }
      if (node.content) {
        node.content.forEach(removeMarksInner);
      }
      return node;
    }
    return removeMarksInner(json);
  }

  static async replaceInternalUrls(
    doc: Node | ProsemirrorData,
    basePath: string
  ) {
    const json = "toJSON" in doc ? (doc.toJSON() as ProsemirrorData) : doc;

    if (basePath.endsWith("/")) {
      throw new Error("internalUrlBase must not end with a slash");
    }

    function replaceUrl(url: string) {
      // Only replace if the URL starts with /doc/ (or) /collection/ (not already in a share path)
      if (url.startsWith("/doc/") || url.startsWith("/collection/")) {
        return `${basePath}${url}`;
      }
      return url;
    }

    function replaceInternalUrlsInner(node: ProsemirrorData) {
      if (typeof node.attrs?.href === "string") {
        node.attrs.href = replaceUrl(node.attrs.href);
      } else if (node.marks) {
        node.marks.forEach((mark) => {
          if (
            typeof mark.attrs?.href === "string" &&
            isInternalUrl(mark.attrs?.href)
          ) {
            mark.attrs.href = replaceUrl(mark.attrs.href);
          }
        });
      }

      if (node.content) {
        node.content.forEach(replaceInternalUrlsInner);
      }

      return node;
    }

    return replaceInternalUrlsInner(json);
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
          if (mark.attrs.href) {
            urls.push(mark.attrs.href);
          }
        }
      });
      if (["image", "video"].includes(node.type.name)) {
        if (node.attrs.src) {
          urls.push(node.attrs.src);
        }
      }
      if (node.type.name === "attachment") {
        if (node.attrs.href) {
          urls.push(node.attrs.href);
        }
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
  public static toHTML(node: Node, options?: HTMLOptions) {
    let view;
    let cleanupEnv;

    try {
      const sheet = new ServerStyleSheet();
      let html = "";
      let styleTags = "";

      const Centered = options?.centered
        ? styled.article`
            max-width: calc(
              ${EditorStyleHelper.documentWidth} +
                ${EditorStyleHelper.documentGutter}
            );
            margin: 0 auto;
            padding: 0 1em;
          `
        : "article";

      const rtl = isRTL(node.textContent);
      const content = <div id="content" className="ProseMirror exported" />;
      const children = (
        <>
          {options?.title && <h1 dir={rtl ? "rtl" : "ltr"}>{options.title}</h1>}
          {options?.includeStyles !== false ? (
            <EditorContainer dir={rtl ? "rtl" : "ltr"} $rtl={rtl} staticHTML>
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
        `<!DOCTYPE html><meta charset="utf-8">${
          options?.includeStyles === false ? "" : styleTags
        }${html}`
      );
      const doc = dom.window.document;
      const target = doc.getElementById("content");

      cleanupEnv = this.patchGlobalEnv(dom.window);

      const diffPlugins = options?.changes
        ? new Diff({ changes: options.changes }).plugins
        : [];

      const state = EditorState.create({
        doc: node,
        plugins: [...plugins, ...diffPlugins],
        schema,
      });

      view = new EditorView(
        { mount: target as HTMLElement },
        {
          state,
          editable: () => false,
        }
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

      // Inject mermaidjs scripts if the document contains mermaid diagrams (supports both "mermaid" and "mermaidjs")
      if (options?.includeMermaid) {
        const mermaidElements = dom.window.document.querySelectorAll(
          `[data-language="mermaid"] pre code, [data-language="mermaidjs"] pre code`
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
          import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
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

      const output = dom.serialize();

      if (options?.includeHead === false) {
        // replace everything upto and including "<body>"
        const body = "<body>";
        const bodyIndex = output.indexOf(body) + body.length;
        if (bodyIndex !== -1) {
          return output
            .substring(bodyIndex)
            .replace("</body>", "")
            .replace("</html>", "");
        }
      }

      return output;
    } finally {
      try {
        view?.destroy();
      } catch (err) {
        Logger.error("Error destroying ProseMirror view", err);
      }
      cleanupEnv?.();
    }
  }

  /**
   * Processes mentions in the Prosemirror data, ensuring that mentions
   * for deleted users are displayed as "@unknown" and updated names are
   * displayed correctly.
   *
   * @param data The ProsemirrorData object to process
   * @returns The processed ProsemirrorData with updated mentions
   */
  static async processMentions(data: ProsemirrorData | Node) {
    const json = "toJSON" in data ? (data.toJSON() as ProsemirrorData) : data;

    // First pass: collect all user IDs from mentions
    const userIds: string[] = [];

    function collectUserIds(node: ProsemirrorData) {
      if (
        node.type === "mention" &&
        node.attrs?.type === MentionType.User &&
        node.attrs?.modelId
      ) {
        userIds.push(node.attrs.modelId as string);
      }

      if (node.content) {
        for (const child of node.content) {
          collectUserIds(child);
        }
      }
    }

    collectUserIds(json);

    // Load all users in a single query
    const uniqueUserIds = [...new Set(userIds)];
    const users = uniqueUserIds.length
      ? await User.findAll({
          where: {
            id: uniqueUserIds,
          },
          attributes: ["id", "name"],
        })
      : [];

    // Create a map for quick lookup
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user.id, user.name);
    });

    // Second pass: transform mentions with loaded user data
    function transformMentions(node: ProsemirrorData) {
      if (
        node.type === "mention" &&
        node.attrs?.type === MentionType.User &&
        node.attrs?.modelId
      ) {
        const userId = node.attrs.modelId as string;
        node.attrs = {
          ...node.attrs,
          label: userMap.get(userId) || "Unknown",
        };
      }

      if (node.content) {
        for (const child of node.content) {
          transformMentions(child);
        }
      }

      return node;
    }

    return transformMentions(json);
  }

  /**
   * Removes the first heading from the document if it is an H1.
   *
   * @param doc The Prosemirror document node.
   * @returns A new document with the first H1 removed, or the original if no H1 found.
   */
  static removeFirstHeading(doc: Node): Node {
    const firstChild = doc.firstChild;

    if (
      firstChild &&
      firstChild.type.name === "heading" &&
      firstChild.attrs.level === 1
    ) {
      const content: Node[] = [];
      doc.forEach((node, _offset, index) => {
        if (index > 0) {
          content.push(node);
        }
      });

      // If removing the heading leaves an empty document, return a doc with empty paragraph
      if (content.length === 0) {
        return doc.type.create(null, schema.nodes.paragraph.create());
      }

      return doc.copy(Fragment.fromArray(content));
    }

    return doc;
  }

  /**
   * Extracts an emoji from the beginning of the document's first text content.
   * If found, returns the emoji and a new document with the emoji removed.
   *
   * @param doc The Prosemirror document node.
   * @returns An object with the extracted emoji (or undefined) and the modified document.
   */
  static extractEmojiFromStart(doc: Node): { emoji?: string; doc: Node } {
    // Get the text content from the beginning of the document
    let textContent = "";
    let foundTextNode: Node | null = null;

    doc.descendants((node) => {
      if (foundTextNode) {
        return false;
      }
      if (node.isText && node.text) {
        textContent = node.text;
        foundTextNode = node;
        return false;
      }
      return true;
    });

    if (!textContent) {
      return { doc };
    }

    const regex = emojiRegex();
    const match = regex.exec(textContent.slice(0, 10));

    if (!match || match.index !== 0) {
      return { doc };
    }

    const emoji = match[0];

    // Create a new document with the emoji removed from the text
    const json = doc.toJSON();

    function removeEmojiFromNode(node: any): any {
      if (node.type === "text" && node.text && node.text.startsWith(emoji)) {
        return {
          ...node,
          text: node.text.slice(emoji.length),
        };
      }
      if (node.content) {
        let found = false;
        return {
          ...node,
          content: node.content.map((child: any) => {
            if (found) {
              return child;
            }
            const result = removeEmojiFromNode(child);
            if (result !== child) {
              found = true;
            }
            return result;
          }),
        };
      }
      return node;
    }

    const modifiedJson = removeEmojiFromNode(json);
    return {
      emoji,
      doc: Node.fromJSON(schema, modifiedJson),
    };
  }

  /**
   * Patches the global environment with properties from the JSDOM window,
   * necessary for ProseMirror to run in a Node environment.
   *
   * @param domWindow The JSDOM window object.
   * @returns A cleanup function to restore the global environment.
   */
  public static patchGlobalEnv(domWindow: JSDOM["window"]) {
    const g = global as any;

    const globalParams = {
      window: g.window,
      document: g.document,
      navigator: g.navigator,
      getSelection: g.getSelection,
      requestAnimationFrame: g.requestAnimationFrame,
      cancelAnimationFrame: g.cancelAnimationFrame,
      HTMLElement: g.HTMLElement,
      Node: g.Node,
      MutationObserver: g.MutationObserver,
    };

    const patch = (key: string, value: unknown) => {
      try {
        g[key] = value;
      } catch (_err) {
        // Ignore errors if property is read-only
      }
    };

    patch("window", domWindow);
    patch("document", domWindow.document);
    patch("navigator", domWindow.navigator);
    patch("getSelection", () => null);
    patch("requestAnimationFrame", (fn: Function) => setTimeout(fn, 0));
    patch("cancelAnimationFrame", (id: number) => clearTimeout(id));
    patch("HTMLElement", domWindow.HTMLElement);
    patch("Node", domWindow.Node);
    patch("MutationObserver", domWindow.MutationObserver);

    return () => {
      Object.entries(globalParams).forEach(([key, value]) => {
        try {
          g[key] = value;
        } catch (_err) {
          // Ignore errors if property is read-only
        }
      });
    };
  }

  /**
   * Replaces remote and base64 encoded images in the given Prosemirror node
   * with attachment urls and uploads the images to the storage provider.
   *
   * @param ctx The API context.
   * @param doc The Prosemirror node to process.
   * @param user The user context.
   * @returns A new Prosemirror node with images replaced.
   */
  static async replaceImagesWithAttachments(
    ctx: APIContext,
    doc: Node,
    user: User
  ): Promise<Node> {
    const images = SharedProsemirrorHelper.getImages(doc);
    const videos = SharedProsemirrorHelper.getVideos(doc);
    const nodes = [...images, ...videos];

    if (!nodes.length) {
      return doc;
    }

    const timeoutPerImage = Math.floor(
      Math.min(env.REQUEST_TIMEOUT / nodes.length, 10000)
    );

    const urlToAttachment: Map<string, Attachment> = new Map();
    const chunks = chunk(nodes, 10);

    for (const nodeChunk of chunks) {
      await Promise.all(
        nodeChunk.map(async (node) => {
          const src = String(node.attrs.src ?? "");

          // Skip invalid URLs
          try {
            new URL(src);
          } catch {
            return;
          }

          // Skip internal URLs
          if (isInternalUrl(src)) {
            return;
          }

          // Skip already processed
          if (urlToAttachment.has(src)) {
            return;
          }

          try {
            const attachment = await attachmentCreator({
              name: String(node.attrs.alt ?? node.type.name),
              url: src,
              preset: AttachmentPreset.DocumentAttachment,
              user,
              fetchOptions: {
                timeout: timeoutPerImage,
              },
              ctx,
            });

            if (attachment) {
              urlToAttachment.set(src, attachment);
            }
          } catch (err) {
            Logger.warn("Failed to download image for attachment", {
              error: err.message,
              src,
            });
          }
        })
      );
    }

    // Transform the document to replace image/video src attributes
    const transformFragment = (fragment: Fragment): Fragment => {
      const transformedNodes: Node[] = [];

      fragment.forEach((node) => {
        if (node.type.name === "image" || node.type.name === "video") {
          const src = String(node.attrs.src ?? "");
          const attachment = urlToAttachment.get(src);

          if (attachment) {
            const json = node.toJSON();
            json.attrs = { ...json.attrs, src: attachment.redirectUrl };
            transformedNodes.push(Node.fromJSON(schema, json));
          } else {
            transformedNodes.push(node);
          }
        } else if (node.content.size > 0) {
          transformedNodes.push(node.copy(transformFragment(node.content)));
        } else {
          transformedNodes.push(node);
        }
      });

      return Fragment.fromArray(transformedNodes);
    };

    return doc.copy(transformFragment(doc.content));
  }
}
