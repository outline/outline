import { t } from "i18next";
import type Token from "markdown-it/lib/token.mjs";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection, TextSelection } from "prosemirror-state";
import * as React from "react";
import type { Primitive } from "utility-types";
import { getEventFiles } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import insertFiles from "../commands/insertFiles";
import toggleWrap from "../commands/toggleWrap";
import Caption from "../components/Caption";
import VideoComponent from "../components/Video";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import attachmentsRule from "../rules/links";
import type { ComponentProps } from "../types";
import Node from "./Node";

const parseDimension = (value: string | null): number | null => {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Downloads a video through a blob URL, as videos are served inline and a
 * plain link would open them for playback.
 *
 * @param src the sanitized video URL.
 * @param title the video caption, used as the file name.
 */
const downloadVideo = async (src: string, title: string | null) => {
  try {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const extension = blob.type.split("/")[1];
    const name = title || "video";

    // create a temporary link node and click it with our video data
    const link = document.createElement("a");
    link.href = url;
    link.download =
      extension && !name.endsWith(`.${extension}`)
        ? `${name}.${extension}`
        : name;
    document.body.appendChild(link);
    link.click();

    // cleanup
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url));
  } catch {
    window.open(src, "_blank", "noopener,noreferrer");
  }
};

export default class Video extends Node {
  get name() {
    return "video";
  }

  get rulePlugins() {
    return [attachmentsRule];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        id: {
          default: null,
        },
        src: {
          default: null,
        },
        width: {
          default: null,
        },
        height: {
          default: null,
        },
        title: {
          default: null,
          validate: "string|null",
        },
      },
      group: "block",
      selectable: true,
      // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1289000
      draggable: false,
      defining: true,
      atom: true,
      parseDOM: [
        {
          priority: 100,
          tag: "video",
          getAttrs: (dom: HTMLVideoElement) => ({
            id: dom.id,
            title: dom.getAttribute("title"),
            src: dom.getAttribute("src"),
            width: parseDimension(dom.getAttribute("width")),
            height: parseDimension(dom.getAttribute("height")),
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: "video",
        },
        [
          "video",
          {
            id: node.attrs.id,
            src: sanitizeUrl(node.attrs.src),
            controls: true,
            width: node.attrs.width,
            height: node.attrs.height,
          },
          String(node.attrs.title),
        ],
      ],
      leafText: (node) => node.attrs.title,
    };
  }

  handleSelect =
    ({ getPos }: { getPos: () => number | undefined }) =>
    () => {
      const { view } = this.editor;
      const pos = getPos();
      if (pos === undefined) {
        return;
      }

      const $pos = view.state.doc.resolve(pos);
      const transaction = view.state.tr.setSelection(new NodeSelection($pos));
      view.dispatch(transaction);
    };

  handleChangeSize =
    ({
      node,
      getPos,
    }: {
      node: ProsemirrorNode;
      getPos: () => number | undefined;
    }) =>
    ({ width, height }: { width: number; height?: number }) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      if (pos === undefined) {
        return;
      }

      const transaction = tr
        .setNodeMarkup(pos, undefined, {
          ...node.attrs,
          width,
          height,
        })
        .setMeta("addToHistory", true);
      const $pos = transaction.doc.resolve(pos);
      view.dispatch(transaction.setSelection(new NodeSelection($pos)));
    };

  handleCaptionKeyDown =
    ({
      node,
      getPos,
    }: {
      node: ProsemirrorNode;
      getPos: () => number | undefined;
    }) =>
    (event: React.KeyboardEvent<HTMLParagraphElement>) => {
      // Pressing Enter in the caption field should move the cursor/selection
      // below the video
      if (event.key === "Enter") {
        event.preventDefault();

        const { view } = this.editor;
        const pos = getPos();
        if (pos === undefined) {
          return;
        }

        const $pos = view.state.doc.resolve(pos + node.nodeSize);
        view.dispatch(
          view.state.tr.setSelection(TextSelection.near($pos)).scrollIntoView()
        );
        view.focus();
        return;
      }

      // Pressing Backspace in an empty caption field focuses the video.
      if (event.key === "Backspace" && event.currentTarget.innerText === "") {
        event.preventDefault();
        event.stopPropagation();
        const { view } = this.editor;
        const pos = getPos();
        if (pos === undefined) {
          return;
        }

        const $pos = view.state.doc.resolve(pos);
        const tr = view.state.tr.setSelection(new NodeSelection($pos));
        view.dispatch(tr);
        view.focus();
        return;
      }
    };

  handleCaptionBlur =
    ({
      node,
      getPos,
    }: {
      node: ProsemirrorNode;
      getPos: () => number | undefined;
    }) =>
    (event: React.FocusEvent<HTMLParagraphElement>) => {
      const caption = event.currentTarget.innerText;
      if (caption === node.attrs.title) {
        return;
      }

      const { view } = this.editor;
      const { tr } = view.state;

      // The blur may fire while the node view is being torn down, at which
      // point the position no longer refers to this video in the document.
      const pos = getPos();
      if (pos === undefined || view.state.doc.nodeAt(pos)?.type !== node.type) {
        return;
      }

      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        title: caption,
      });
      view.dispatch(transaction);
    };

  component = (props: ComponentProps) => (
    <VideoComponent {...props} onChangeSize={this.handleChangeSize(props)}>
      <Caption
        width={props.node.attrs.width}
        onBlur={this.handleCaptionBlur(props)}
        onKeyDown={this.handleCaptionKeyDown(props)}
        isSelected={props.isSelected}
        placeholder={t("Write a caption")}
      >
        {props.node.attrs.title}
      </Caption>
    </VideoComponent>
  );

  commands({ type }: { type: NodeType }) {
    return {
      video: (attrs: Record<string, Primitive>) => toggleWrap(type, attrs),
      deleteVideo: (): Command => (state, dispatch) => {
        dispatch?.(state.tr.deleteSelection());
        return true;
      },
      replaceVideo: (): Command => (state) => {
        if (
          !(state.selection instanceof NodeSelection) ||
          state.selection.node.type !== type
        ) {
          return false;
        }
        const { view } = this.editor;
        const { node } = state.selection;
        const { uploadFile, onFileUploadStart, onFileUploadStop, onNotice } =
          this.editor.props;

        if (!uploadFile) {
          throw new Error("uploadFile prop is required to replace videos");
        }

        // create an input element and click to trigger picker
        const inputElement = document.createElement("input");
        inputElement.type = "file";
        inputElement.accept = "video/*";
        inputElement.onchange = (event) => {
          const files = getEventFiles(event);
          void insertFiles(view, event, state.selection.from, files, {
            uploadFile,
            onFileUploadStart,
            onFileUploadStop,
            onNotice,
            replaceExisting: true,
            attrs: node.attrs.title ? { title: node.attrs.title } : undefined,
          });
        };
        inputElement.click();
        return true;
      },
      downloadVideo: (): Command => (state) => {
        if (
          !(state.selection instanceof NodeSelection) ||
          state.selection.node.type !== type
        ) {
          return false;
        }
        const { node } = state.selection;
        const src = sanitizeUrl(node.attrs.src);
        if (!src) {
          return false;
        }

        void downloadVideo(src, node.attrs.title);
        return true;
      },
      resizeVideo:
        ({ width, height }: { width: number; height: number }): Command =>
        (state, dispatch) => {
          if (
            !(state.selection instanceof NodeSelection) ||
            state.selection.node.type !== type
          ) {
            return false;
          }

          const { selection } = state;
          const tr = state.tr
            .setNodeMarkup(selection.from, undefined, {
              ...selection.node.attrs,
              width,
              height,
            })
            .setMeta("addToHistory", true);

          const $pos = tr.doc.resolve(selection.from);
          dispatch?.(tr.setSelection(new NodeSelection($pos)));
          return true;
        },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    state.write(
      `[${node.attrs.title} ${node.attrs.width ?? ""}x${
        node.attrs.height ?? ""
      }](${node.attrs.src})\n\n`
    );
    state.ensureNewLine();
  }

  parseMarkdown() {
    return {
      node: "video",
      getAttrs: (tok: Token) => ({
        src: tok.attrGet("src"),
        title: tok.attrGet("title"),
        width: parseDimension(tok.attrGet("width")),
        height: parseDimension(tok.attrGet("height")),
      }),
    };
  }
}
