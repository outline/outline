import { JSDOM } from "jsdom";
import { Node, DOMSerializer } from "prosemirror-model";
import * as React from "react";
import { renderToString } from "react-dom/server";
import styled, { ServerStyleSheet, ThemeProvider } from "styled-components";
import EditorContainer from "@shared/editor/components/Styles";
import GlobalStyles from "@shared/styles/globals";
import light from "@shared/styles/theme";
import { isRTL } from "@shared/utils/rtl";
import { schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";

export type HTMLOptions = {
  /** A title, if it should be included */
  title?: string;
  /** Whether to include style tags in the generated HTML (defaults to true) */
  includeStyles?: boolean;
  /** Whether to include styles to center diff (defaults to true) */
  centered?: boolean;
};

type MentionAttrs = {
  type: string;
  label: string;
  modelId: string;
  actorId: string | undefined;
  id: string;
};

@trace()
export default class ProsemirrorHelper {
  /**
   * Returns the data as a Prosemirror Node.
   *
   * @param node The node to parse
   * @returns The content as a Prosemirror Node
   */
  static toProsemirror(data: Record<string, any>) {
    return Node.fromJSON(schema, data);
  }

  /**
   * Returns an array of attributes of all mentions in the node.
   *
   * @param node The node to parse mentions from
   * @returns An array of mention attributes
   */
  static parseMentions(node: Node) {
    const mentions: MentionAttrs[] = [];

    node.descendants((node: Node) => {
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
   * Returns the node as HTML. This is a lossy conversion and should only be used
   * for export.
   *
   * @param node The node to convert to HTML
   * @param options Options for the HTML output
   * @returns The content as a HTML string
   */
  static toHTML(node: Node, options?: HTMLOptions) {
    const sheet = new ServerStyleSheet();
    let html, styleTags;

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
          <EditorContainer dir={rtl ? "rtl" : "ltr"} rtl={rtl}>
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
                  <GlobalStyles />
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

    return dom.serialize();
  }
}
