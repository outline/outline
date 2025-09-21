import { Token } from "markdown-it";
import { DownloadIcon } from "outline-icons";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Command, NodeSelection } from "prosemirror-state";
import * as React from "react";
import { Trans } from "react-i18next";
import { Primitive } from "utility-types";
import { bytesToHumanReadable, getEventFiles } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import insertFiles from "../commands/insertFiles";
import toggleWrap from "../commands/toggleWrap";
import FileExtension from "../components/FileExtension";
import Widget from "../components/Widget";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/links";
import { ComponentProps } from "../types";
import Node from "./Node";
import PdfViewer from "../components/PDF";

export default class Attachment extends Node {
  get name() {
    return "attachment";
  }

  get rulePlugins() {
    // to do: modify the rules plugin to include preview for PDFs
    return [attachmentsRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        id: {
          default: null,
        },
        href: {
          default: null,
        },
        title: {},
        size: {
          default: 0,
        },
        preview: {
          default: false,
        },
        width: {
          default: 300,
        },
        height: {
          default: 424,
        },
        type: {
          default: null,
          validate: "string|null",
        },
        layoutClass: {
          default: null,
          validate: "string|null",
        },
      },
      group: "block",
      defining: true,
      atom: true,
      parseDOM: [
        {
          priority: 100,
          tag: "a.attachment",
          getAttrs: (dom: HTMLAnchorElement) => ({
            id: dom.id,
            title: dom.innerText,
            href: dom.getAttribute("href"),
            size: parseInt(dom.dataset.size || "0", 10),
          }),
        },
      ],
      toDOM: (node) => [
        "a",
        {
          class: `attachment`,
          id: node.attrs.id,
          href: sanitizeUrl(node.attrs.href),
          download: node.attrs.title,
          "data-size": node.attrs.size,
        },
        String(node.attrs.title),
      ],
      leafText: (node) => node.attrs.title,
    };
  }

  handleSelect =
    ({ getPos }: ComponentProps) =>
    () => {
      const { view } = this.editor;
      const $pos = view.state.doc.resolve(getPos());
      const transaction = view.state.tr.setSelection(new NodeSelection($pos));
      view.dispatch(transaction);
    };

  handleChangeSize =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    ({ width, height }: { width: number; height?: number }) => {
      if (!node.attrs.preview) {
        return;
      }

      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      const transaction = tr
        .setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width,
          height,
        })
        .setMeta("addToHistory", true);
      const $pos = transaction.doc.resolve(getPos());
      view.dispatch(transaction.setSelection(new NodeSelection($pos)));
    };

  component = (props: ComponentProps) => {
    const { isSelected, isEditable, theme, node } = props;
    return node.attrs.preview && node.attrs.type === "pdf" ? (
      <PdfViewer {...props} onChangeSize={this.handleChangeSize(props)} />
    ) : (
      <Widget
        icon={<FileExtension title={node.attrs.title} />}
        href={node.attrs.href}
        title={node.attrs.title}
        onMouseDown={this.handleSelect(props)}
        onDoubleClick={() => {
          this.editor.commands.downloadAttachment();
        }}
        onClick={(event) => {
          if (isEditable) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        context={
          node.attrs.href ? (
            bytesToHumanReadable(node.attrs.size || "0")
          ) : (
            <>
              <Trans>Uploading</Trans>…
            </>
          )
        }
        isSelected={isSelected}
        theme={theme}
      >
        {node.attrs.href && !isEditable && <DownloadIcon size={20} />}
      </Widget>
    );
  };

  commands({ type }: { type: NodeType }) {
    return {
      createAttachment: (attrs: Record<string, Primitive>) =>
        toggleWrap(type, attrs),
      deleteAttachment: (): Command => (state, dispatch) => {
        dispatch?.(state.tr.deleteSelection());
        return true;
      },
      replaceAttachment: (): Command => (state) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const { view } = this.editor;
        const { node } = state.selection;
        const { uploadFile, onFileUploadStart, onFileUploadStop } =
          this.editor.props;

        if (!uploadFile) {
          throw new Error("uploadFile prop is required to replace attachments");
        }

        const accept =
          node.attrs.type === "pdf"
            ? ".pdf"
            : node.type.name === "attachment"
              ? "*"
              : null;

        if (accept === null) {
          return false;
        }

        // create an input element and click to trigger picker
        const inputElement = document.createElement("input");
        inputElement.type = "file";
        inputElement.accept = accept;
        inputElement.onchange = (event) => {
          const files = getEventFiles(event);
          void insertFiles(view, event, state.selection.from, files, {
            uploadFile,
            onFileUploadStart,
            onFileUploadStop,
            dictionary: this.options.dictionary,
            replaceExisting: true,
          });
        };
        inputElement.click();
        return true;
      },
      downloadAttachment: (): Command => (state) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const { node } = state.selection;

        // create a temporary link node and click it
        const link = document.createElement("a");
        link.href = node.attrs.href;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();

        // cleanup
        document.body.removeChild(link);
        return true;
      },
      resizeAttachment:
        ({ width, height }: { width: number; height?: number }): Command =>
        (state, dispatch) => {
          if (
            !(state.selection instanceof NodeSelection) ||
            !state.selection.node.attrs.preview
          ) {
            return false;
          }

          const { view } = this.editor;
          const { tr } = view.state;
          const { attrs } = state.selection.node;

          const transaction = tr
            .setNodeMarkup(state.selection.from, undefined, {
              ...attrs,
              width,
              height,
            })
            .setMeta("addToHistory", true);
          const $pos = transaction.doc.resolve(state.selection.from);
          dispatch?.(transaction.setSelection(new NodeSelection($pos)));
          return true;
        },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();

    const attrs = [
      `href="${node.attrs.href}"`,
      `title="${node.attrs.title}"`,
      `size="${node.attrs.size}"`,
    ];

    if (node.attrs.preview) {
      attrs.push(`preview="${node.attrs.preview}"`);

      if (node.attrs.width) {attrs.push(`width="${node.attrs.width}"`);}
      if (node.attrs.height) {attrs.push(`height="${node.attrs.height}"`);}
      if (node.attrs.layoutClass)
        {attrs.push(`layoutClass="${node.attrs.layoutClass}"`);}
    }

    state.write(
      `[${node.attrs.title}](${node.attrs.href}){${attrs.join(" ")}}\n\n`
    );
    state.ensureNewLine();
  }

  parseMarkdown() {
    return {
      node: "attachment",
      getAttrs: (tok: Token) => ({
        href: tok.attrGet("href"),
        title: tok.attrGet("title"),
        size: tok.attrGet("size"),
        width: tok.attrGet("width"),
        height: tok.attrGet("height"),
        preview: tok.attrGet("preview"),
        layoutClass: tok.attrGet("layoutClass"),
      }),
    };
  }
}
