import type { Token } from "markdown-it";
import { InputRule } from "prosemirror-inputrules";
import type {
  Node as ProsemirrorNode,
  NodeSpec,
  NodeType,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection, Plugin, TextSelection } from "prosemirror-state";
import * as React from "react";
import { sanitizeUrl } from "../../utils/urls";
import Caption from "../components/Caption";
import ImageComponent from "../components/Image";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import type { ComponentProps } from "../types";
import SimpleImage from "./SimpleImage";
import { LightboxImageFactory } from "../lib/Lightbox";
import { ImageSource } from "../lib/FileHelper";
import { DiagramPlaceholder } from "../components/DiagramPlaceholder";
import { addComment } from "../commands/comment";
import { addLink } from "../commands/link";

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

export const downloadImageNode = async (
  node: ProsemirrorNode,
  cache?: RequestCache
) => {
  try {
    const image = await fetch(node.attrs.src, {
      cache,
    });
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
  } catch {
    if (cache !== "reload") {
      downloadImageNode(node, "reload");
    } else {
      window.open(sanitizeUrl(node.attrs.src), "_blank");
    }
  }
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
        source: {
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
        marks: {
          default: undefined,
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
              source: img?.getAttribute("source"),
              width: width ? parseInt(width, 10) : undefined,
              height: height ? parseInt(height, 10) : undefined,
              layoutClass,
            };
          },
        },
        {
          tag: "img",
          getAttrs: (dom: HTMLImageElement) => {
            // Don't parse images from our own editor with this rule.
            if (
              dom.parentElement?.classList.contains("image") ||
              dom.parentElement?.classList.contains("emoji")
            ) {
              return false;
            }

            // First try HTML attributes
            let width = dom.getAttribute("width");
            let height = dom.getAttribute("height");

            // If no HTML attributes, try CSS styles
            if (!width && dom.style.width) {
              const styleWidth = dom.style.width;
              if (styleWidth.endsWith("px")) {
                width = styleWidth.slice(0, -2);
              }
            }
            if (!height && dom.style.height) {
              const styleHeight = dom.style.height;
              if (styleHeight.endsWith("px")) {
                height = styleHeight.slice(0, -2);
              }
            }

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
      leafText: (node) =>
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
    ({ node, getPos }: ComponentProps) =>
    ({ width, height }: { width: number; height?: number }) => {
      const { view, commands } = this.editor;
      const { doc, tr } = view.state;

      const pos = getPos();
      const $pos = doc.resolve(pos);

      view.dispatch(tr.setSelection(new NodeSelection($pos)));
      commands["resizeImage"]({
        width,
        height: height || node.attrs.height,
      });
    };

  handleCaptionKeyDown =
    ({ node, getPos }: ComponentProps) =>
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

      // Pressing Backspace in an empty caption field focused the image.
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
    ({ node, getPos }: ComponentProps) =>
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

  handleZoomIn =
    ({ getPos, view }: ComponentProps) =>
    () => {
      this.editor.updateActiveLightboxImage(
        LightboxImageFactory.createLightboxImage(view, getPos())
      );
    };

  handleClick =
    ({ getPos, view }: ComponentProps) =>
    () => {
      this.editor.updateActiveLightboxImage(
        LightboxImageFactory.createLightboxImage(view, getPos())
      );
    };

  handleDownload =
    ({ node }: ComponentProps) =>
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      return downloadImageNode(node);
    };

  handleEditDiagram =
    ({ getPos, view }: ComponentProps) =>
    () => {
      const { commands } = this.editor;
      const pos = getPos();
      const $pos = view.state.doc.resolve(pos);
      view.dispatch(view.state.tr.setSelection(new NodeSelection($pos)));
      commands.editDiagram();
    };

  component = (props: ComponentProps) => {
    if (
      props.node.attrs.source === ImageSource.DiagramsNet &&
      !props.node.attrs.src
    ) {
      return (
        <DiagramPlaceholder
          onDoubleClick={this.handleEditDiagram(props)}
          {...props}
        />
      );
    }

    return (
      <ImageComponent
        {...props}
        onClick={this.handleClick(props)}
        onDownload={this.handleDownload(props)}
        onZoomIn={this.handleZoomIn(props)}
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
  };

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
        alt: token.content || null,
        ...parseTitleAttribute(token?.attrGet("title") || ""),
      }),
    };
  }

  keys(): Record<string, Command> {
    return {
      "Mod-Alt-m": addComment({ userId: this.options.userId }),
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
        let layoutClass: string | null = "full-width";
        if (state.selection.node.attrs.layoutClass === layoutClass) {
          layoutClass = null;
        }
        const attrs = {
          ...state.selection.node.attrs,
          title: null,
          layoutClass,
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
      resizeImage:
        ({ width, height }: { width: number; height: number }): Command =>
        (state, dispatch) => {
          if (!(state.selection instanceof NodeSelection)) {
            return false;
          }

          const { selection } = state;
          const transformedAttrs = {
            ...state.selection.node.attrs,
            width,
            height,
          };

          const tr = state.tr
            .setNodeMarkup(selection.from, undefined, transformedAttrs)
            .setMeta("addToHistory", true);

          const $pos = tr.doc.resolve(selection.from);
          dispatch?.(tr.setSelection(new NodeSelection($pos)));
          return true;
        },
      commentOnImage: (): Command =>
        addComment({ userId: this.options.userId }),
      linkOnImage: (): Command => addLink({ href: "" }),
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
