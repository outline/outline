import { Token } from "markdown-it";
import { InputRule } from "prosemirror-inputrules";
import { Node as ProsemirrorNode, NodeSpec, NodeType } from "prosemirror-model";
import {
  NodeSelection,
  Plugin,
  Command,
  TextSelection,
} from "prosemirror-state";
import * as React from "react";
import { sanitizeUrl } from "../../utils/urls";
import Caption from "../components/Caption";
import ImageComponent from "../components/Image";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { ComponentProps } from "../types";
import SimpleImage from "./SimpleImage";

const imageSizeRegex = /\s=(\d+)?x(\d+)?$/;

type TitleAttributes = {
  layoutClass?: string;
  title?: string;
  width?: number;
  height?: number;
};

const parseTitleAttribute = (tokenTitle: string): TitleAttributes => {
  const attributes: TitleAttributes = {
    layoutClass: undefined,
    title: undefined,
    width: undefined,
    height: undefined,
  };
  if (!tokenTitle) {
    return attributes;
  }

  ["right-50", "left-50", "full-width"].map((className) => {
    if (tokenTitle.includes(className)) {
      attributes.layoutClass = className;
      tokenTitle = tokenTitle.replace(className, "");
    }
  });

  const match = tokenTitle.match(imageSizeRegex);
  if (match) {
    attributes.width = parseInt(match[1], 10);
    attributes.height = parseInt(match[2], 10);
    tokenTitle = tokenTitle.replace(imageSizeRegex, "");
  }

  attributes.title = tokenTitle;

  return attributes;
};

const downloadImageNode = async (node: ProsemirrorNode) => {
  const image = await fetch(node.attrs.src);
  const imageBlob = await image.blob();
  const imageURL = URL.createObjectURL(imageBlob);
  const extension = imageBlob.type.split(/\/|\+/g)[1];
  const potentialName = node.attrs.alt || "image";

  // create a temporary link node and click it with our image data
  const link = document.createElement("a");
  link.href = imageURL;
  link.download = `${potentialName}.${extension}`;
  document.body.appendChild(link);
  link.click();

  // cleanup
  document.body.removeChild(link);
};

export default class Image extends SimpleImage {
  get schema(): NodeSpec {
    return {
      inline: true,
      attrs: {
        src: {
          default: "",
          validate: "string",
        },
        width: {
          default: undefined,
        },
        height: {
          default: undefined,
        },
        alt: {
          default: null,
          validate: "string|null",
        },
        layoutClass: {
          default: null,
          validate: "string|null",
        },
        title: {
          default: null,
          validate: "string|null",
        },
      },
      content: "text*",
      marks: "",
      group: "inline",
      selectable: true,
      // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1289000
      draggable: false,
      atom: true,
      parseDOM: [
        {
          tag: "div[class~=image]",
          getAttrs: (dom: HTMLDivElement) => {
            const img = dom.getElementsByTagName("img")[0] as
              | HTMLImageElement
              | undefined;
            const className = dom.className;
            const layoutClassMatched =
              className && className.match(/image-(.*)$/);
            const layoutClass = layoutClassMatched
              ? layoutClassMatched[1]
              : null;

            const width = img?.getAttribute("width");
            const height = img?.getAttribute("height");
            return {
              src: img?.getAttribute("src"),
              alt: img?.getAttribute("alt"),
              title: img?.getAttribute("title"),
              width: width ? parseInt(width, 10) : undefined,
              height: height ? parseInt(height, 10) : undefined,
              layoutClass,
            };
          },
        },
        {
          tag: "img",
          getAttrs: (dom: HTMLImageElement) => {
            const width = dom.getAttribute("width");
            const height = dom.getAttribute("height");
            return {
              src: dom.getAttribute("src"),
              alt: dom.getAttribute("alt"),
              title: dom.getAttribute("title"),
              width: width ? parseInt(width, 10) : undefined,
              height: height ? parseInt(height, 10) : undefined,
            };
          },
        },
      ],
      toDOM: (node) => {
        const className = node.attrs.layoutClass
          ? `image image-${node.attrs.layoutClass}`
          : "image";

        const children = [
          [
            "img",
            {
              ...node.attrs,
              src: sanitizeUrl(node.attrs.src),
              width: node.attrs.width,
              height: node.attrs.height,
              contentEditable: "false",
            },
          ],
        ];

        if (node.attrs.alt) {
          children.push([
            "p",
            { class: EditorStyleHelper.imageCaption },
            node.attrs.alt,
          ]);
        }

        return [
          "div",
          {
            class: className,
          },
          ...children,
        ];
      },
      toPlainText: (node) =>
        node.attrs.alt ? `(image: ${node.attrs.alt})` : "(image)",
    };
  }

  get plugins() {
    return [
      ...super.plugins,
      new Plugin({
        props: {
          handleKeyDown: (view, event) => {
            // prevent prosemirror's default spacebar behavior
            // & zoom in if the selected node is image
            if (event.key === " ") {
              const { state } = view;
              const { selection } = state;
              if (selection instanceof NodeSelection) {
                const { node } = selection;
                if (node.type.name === "image") {
                  const image = document.querySelector(
                    ".ProseMirror-selectednode img"
                  ) as HTMLImageElement;
                  image.click();
                  return true;
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  }

  handleChangeSize =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    ({ width, height }: { width: number; height?: number }) => {
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

  handleDownload =
    ({ node }: { node: ProsemirrorNode }) =>
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      void downloadImageNode(node);
    };

  handleCaptionKeyDown =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (event: React.KeyboardEvent<HTMLParagraphElement>) => {
      // Pressing Enter in the caption field should move the cursor/selection
      // below the image and create a new paragraph.
      if (event.key === "Enter") {
        event.preventDefault();

        const { view } = this.editor;
        const $pos = view.state.doc.resolve(getPos() + node.nodeSize);
        view.dispatch(
          view.state.tr
            .setSelection(TextSelection.near($pos))
            .split($pos.pos)
            .scrollIntoView()
        );
        view.focus();
        return;
      }

      // Pressing Backspace in an an empty caption field focused the image.
      if (event.key === "Backspace" && event.currentTarget.innerText === "") {
        event.preventDefault();
        event.stopPropagation();
        const { view } = this.editor;
        const $pos = view.state.doc.resolve(getPos());
        const tr = view.state.tr.setSelection(new NodeSelection($pos));
        view.dispatch(tr);
        view.focus();
        return;
      }
    };

  handleCaptionBlur =
    ({ node, getPos }: { node: ProsemirrorNode; getPos: () => number }) =>
    (event: React.FocusEvent<HTMLParagraphElement>) => {
      const caption = event.currentTarget.innerText;
      if (caption === node.attrs.alt) {
        return;
      }

      const { view } = this.editor;
      const { tr } = view.state;

      // update meta on object
      const pos = getPos();
      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        alt: caption,
      });
      view.dispatch(transaction);
    };

  component = (props: ComponentProps) => (
    <ImageComponent
      {...props}
      onClick={this.handleSelect(props)}
      onDownload={this.handleDownload(props)}
      onChangeSize={this.handleChangeSize(props)}
    >
      <Caption
        width={props.node.attrs.width}
        onBlur={this.handleCaptionBlur(props)}
        onKeyDown={this.handleCaptionKeyDown(props)}
        isSelected={props.isSelected}
        placeholder={this.options.dictionary.imageCaptionPlaceholder}
      >
        {props.node.attrs.alt}
      </Caption>
    </ImageComponent>
  );

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    // Skip the preceding space for images at the start of a list item or Markdown parsers may
    // render them as code blocks
    let markdown = state.inList ? "" : " ";

    markdown +=
      "![" +
      state.esc((node.attrs.alt || "").replace("\n", "") || "", false) +
      "](" +
      state.esc(node.attrs.src || "", false);

    let size = "";
    if (node.attrs.width || node.attrs.height) {
      size = ` =${state.esc(
        node.attrs.width ? String(node.attrs.width) : "",
        false
      )}x${state.esc(
        node.attrs.height ? String(node.attrs.height) : "",
        false
      )}`;
    }
    if (node.attrs.layoutClass) {
      markdown += ' "' + state.esc(node.attrs.layoutClass, false) + size + '"';
    } else if (node.attrs.title) {
      markdown += ' "' + state.esc(node.attrs.title, false) + size + '"';
    } else if (size) {
      markdown += ' "' + size + '"';
    }
    markdown += ")";
    state.write(markdown);
  }

  parseMarkdown() {
    return {
      node: "image",
      getAttrs: (token: Token) => ({
        src: token.attrGet("src"),
        alt:
          (token?.children && token.children[0] && token.children[0].content) ||
          null,
        ...parseTitleAttribute(token?.attrGet("title") || ""),
      }),
    };
  }

  commands({ type }: { type: NodeType }) {
    return {
      ...super.commands({ type }),
      downloadImage: (): Command => (state) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const { node } = state.selection;

        if (node.type.name !== "image") {
          return false;
        }

        void downloadImageNode(node);

        return true;
      },
      alignRight: (): Command => (state, dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const attrs = {
          ...state.selection.node.attrs,
          title: null,
          layoutClass: "right-50",
        };
        const { selection } = state;
        dispatch?.(state.tr.setNodeMarkup(selection.from, undefined, attrs));
        return true;
      },
      alignLeft: (): Command => (state, dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const attrs = {
          ...state.selection.node.attrs,
          title: null,
          layoutClass: "left-50",
        };
        const { selection } = state;
        dispatch?.(state.tr.setNodeMarkup(selection.from, undefined, attrs));
        return true;
      },
      alignFullWidth: (): Command => (state, dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const attrs = {
          ...state.selection.node.attrs,
          title: null,
          layoutClass: "full-width",
        };
        const { selection } = state;
        dispatch?.(state.tr.setNodeMarkup(selection.from, undefined, attrs));
        return true;
      },
      alignCenter: (): Command => (state, dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const attrs = { ...state.selection.node.attrs, layoutClass: null };
        const { selection } = state;
        dispatch?.(state.tr.setNodeMarkup(selection.from, undefined, attrs));
        return true;
      },
    };
  }

  inputRules({ type }: { type: NodeType }) {
    /**
     * Matches following attributes in Markdown-typed image: [, alt, src, class]
     *
     * Example:
     * ![Lorem](image.jpg) -> [, "Lorem", "image.jpg"]
     * ![](image.jpg "class") -> [, "", "image.jpg", "small"]
     * ![Lorem](image.jpg "class") -> [, "Lorem", "image.jpg", "small"]
     */
    const IMAGE_INPUT_REGEX =
      /!\[(?<alt>[^\][]*?)]\((?<filename>[^\][]*?)(?=“|\))“?(?<layoutclass>[^\][”]+)?”?\)$/;

    return [
      new InputRule(IMAGE_INPUT_REGEX, (state, match, start, end) => {
        const [okay, alt, src, matchedTitle] = match;
        const { tr } = state;

        if (okay) {
          tr.replaceWith(
            start - 1,
            end,
            type.create({
              src,
              alt,
              ...parseTitleAttribute(matchedTitle),
            })
          );
        }

        return tr;
      }),
    ];
  }
}
