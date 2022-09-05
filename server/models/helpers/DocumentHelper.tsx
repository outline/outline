import {
  updateYFragment,
  yDocToProsemirrorJSON,
} from "@getoutline/y-prosemirror";
import { JSDOM } from "jsdom";
import diff from "node-htmldiff";
import { Node, DOMSerializer } from "prosemirror-model";
import * as React from "react";
import { renderToString } from "react-dom/server";
import styled, { ServerStyleSheet, ThemeProvider } from "styled-components";
import * as Y from "yjs";
import EditorContainer from "@shared/editor/components/Styles";
import GlobalStyles from "@shared/styles/globals";
import light from "@shared/styles/theme";
import unescape from "@shared/utils/unescape";
import { parser, schema } from "@server/editor";
import Logger from "@server/logging/Logger";
import type Document from "@server/models/Document";
import type Revision from "@server/models/Revision";

export default class DocumentHelper {
  /**
   * Returns the document as a Prosemirror Node. This method uses the
   * collaborative state if available, otherwise it falls back to Markdown->HTML.
   *
   * @param document The document or revision to convert
   * @returns The document content as a Prosemirror Node
   */
  static toProsemirror(document: Document | Revision) {
    if ("state" in document && document.state) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, document.state);
      return Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default"));
    }
    return parser.parse(document.text);
  }

  /**
   * Returns the document as Markdown. This is a lossy conversion and should
   * only be used for export.
   *
   * @param document The document or revision to convert
   * @returns The document title and content as a Markdown string
   */
  static toMarkdown(document: Document | Revision) {
    const text = unescape(document.text);

    if (document.version) {
      return `# ${document.title}\n\n${text}`;
    }

    return text;
  }

  /**
   * Returns the document as plain HTML. This is a lossy conversion and should
   * only be used for export.
   *
   * @param document The document or revision to convert
   * @returns The document title and content as a HTML string
   */
  static toHTML(document: Document | Revision) {
    const node = DocumentHelper.toProsemirror(document);
    const sheet = new ServerStyleSheet();
    let html, styleTags;

    const Centered = styled.article`
      max-width: 46em;
      margin: 0 auto;
      padding: 0 1em;
    `;

    // First render the containing document which has all the editor styles,
    // global styles, layout and title.
    try {
      html = renderToString(
        sheet.collectStyles(
          <ThemeProvider theme={light}>
            <>
              <GlobalStyles />
              <Centered>
                <h1>{document.title}</h1>
                <EditorContainer rtl={false}>
                  <div id="content" className="ProseMirror"></div>
                </EditorContainer>
              </Centered>
            </>
          </ThemeProvider>
        )
      );
      styleTags = sheet.getStyleTags();
    } catch (error) {
      Logger.error("Failed to render styles on document export", error, {
        id: document.id,
      });
    } finally {
      sheet.seal();
    }

    // Render the Prosemirror document using virtual DOM and serialize the
    // result to a string
    const dom = new JSDOM(`<!DOCTYPE html>${styleTags}${html}`);
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

  /**
   * Generates a HTML diff between after documents or revisions.
   *
   * @param before The before document
   * @param after The after document
   * @returns The diff as a HTML string
   */
  static diff(before: Document | Revision, after: Revision) {
    const beforeHTML = DocumentHelper.toHTML(before);
    const afterHTML = DocumentHelper.toHTML(after);
    const beforeDOM = new JSDOM(beforeHTML);
    const afterDOM = new JSDOM(afterHTML);

    // Extract the content from the article tag and diff the HTML, we don't
    // care about the surrounding layout and stylesheets.
    const diffedContentAsHTML = diff(
      beforeDOM.window.document.getElementsByTagName("article")[0].innerHTML,
      afterDOM.window.document.getElementsByTagName("article")[0].innerHTML
    );

    // Inject the diffed content into the original document with styling and
    // serialize back to a string.
    beforeDOM.window.document.getElementsByTagName(
      "article"
    )[0].innerHTML = diffedContentAsHTML;
    return beforeDOM.serialize();
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

    if (document.state) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, document.state);
      const type = ydoc.get("default", Y.XmlFragment) as Y.XmlFragment;
      const doc = parser.parse(document.text);

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
}
