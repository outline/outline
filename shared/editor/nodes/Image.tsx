import { t } from "i18next";
import type Token from "markdown-it/lib/token.mjs";
import { InputRule } from "prosemirror-inputrules";
import type {
  Node as ProsemirrorNode,
  NodeSpec,
  NodeType,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection, Plugin, TextSelection } from "prosemirror-state";
import * as React from "react";
import { sanitizeImageSrc, sanitizeUrl } from "../../utils/urls";
import Caption from "../components/Caption";
import ImageComponent, {
  imageClassName,
  isInlineImageIcon,
} from "../components/Image";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import type { ComponentProps, NodeAttrMark } from "../types";
import SimpleImage from "./SimpleImage";
import { LightboxImageFactory } from "../lib/Lightbox";
import { ImageSource } from "../lib/FileHelper";
import { DiagramPlaceholder } from "../components/DiagramPlaceholder";
import { addComment } from "../commands/comment";
import { addLink } from "../commands/link";
import { commentedImagePlugin } from "../plugins/CommentedImagePlugin";

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
    attributes.width = match[1] ? parseInt(match[1], 10) : undefined;
    attributes.height = match[2] ? parseInt(match[2], 10) : undefined;
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
      await downloadImageNode(node, "reload");
    } else {
      window.open(sanitizeImageSrc(node.attrs.src), "_blank");
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
      draggable: true,
      atom: true,
      parseDOM: [
        {
          // `span` covers inline icons, which use a phrasing-content wrapper.
          tag: "div[class~=image], span[class~=image]",
          getAttrs: (dom: HTMLElement) => {
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

            // A link wrapping the image is stored as a node attribute rather
            // than a mark, parse it back so it survives copy/paste. Sanitize
            // the href as it is rendered directly into the DOM by the view.
            const href = sanitizeUrl(img?.closest("a")?.getAttribute("href"));

            return {
              src: img?.getAttribute("src"),
              alt: img?.getAttribute("alt"),
              title: img?.getAttribute("title"),
              source: img?.getAttribute("source"),
              width: width ? parseInt(width, 10) : undefined,
              height: height ? parseInt(height, 10) : undefined,
              layoutClass,
              marks: href ? [{ type: "link", attrs: { href } }] : undefined,
            };
          },
        },
        {
          tag: "img",
          getAttrs: (dom: HTMLImageElement) => {
            // Don't parse images from our own editor with this rule. A linked
            // image nests the <img> inside an <a>, so check ancestors too.
            if (dom.closest(".image") || dom.closest(".emoji")) {
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
        // Shared with the live NodeView so exported/static HTML renders small
        // images as inline icons too.
        const isInlineIcon = isInlineImageIcon({
          layoutClass: node.attrs.layoutClass,
          width: node.attrs.width,
        });
        const className = imageClassName({
          layoutClass: node.attrs.layoutClass,
          width: node.attrs.width,
        });

        // `marks` is held separately below and is not a valid DOM attribute.
        const { marks, ...attrs } = node.attrs;
        const img = [
          "img",
          {
            ...attrs,
            src: sanitizeImageSrc(node.attrs.src),
            width: node.attrs.width,
            height: node.attrs.height,
            contentEditable: "false",
          },
        ];

        // A link applied to an image is held as a node attribute rather than a
        // mark, so it must be written into the DOM explicitly here.
        const linkHref = (marks as NodeAttrMark[] | undefined)?.find(
          (mark) => mark.type === "link"
        )?.attrs?.href;
        const href = typeof linkHref === "string" ? linkHref : undefined;

        const children = [href ? ["a", { href: sanitizeUrl(href) }, img] : img];

        // Inline icons must use a span wrapper so the browser keeps them inside
        // them inside the containing paragraph; a block `div` (or `p` caption)
        // would be forced onto its own line when the HTML is parsed.
        if (isInlineIcon) {
          return ["span", { class: className }, ...children];
        }

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
      commentedImagePlugin(),
      new Plugin({
        props: {
          handleDOMEvents: {
            dragstart: (_view, event) => {
              // ProseMirror lets the browser snapshot the dragged node's DOM as
              // the drag image. For images that DOM includes the caption area and
              // padding, which renders as a large white box around the image.
              // Substitute the image element so the drag ghost is tight to it.
              if (
                !(event.target instanceof HTMLElement) ||
                !event.dataTransfer
              ) {
                return false;
              }
              const image = event.target
                .closest(`.component-${this.name}`)
                ?.querySelector("img");
              if (image) {
                const rect = image.getBoundingClientRect();
                event.dataTransfer.setDragImage(
                  image,
                  event.clientX - rect.left,
                  event.clientY - rect.top
                );
              }
              return false;
            },
          },
          handleKeyDown: (view, event) => {
            // prevent prosemirror's default spacebar behavior
            // & zoom in if the selected node is image
            if (event.key === " ") {
              const { state } = view;
              const { selection } = state;
              if (selection instanceof NodeSelection) {
                const { node } = selection;
                if (node.type.name === "image") {
                  const image = view.dom.querySelector<HTMLImageElement>(
                    ".ProseMirror-selectednode img"
                  );
                  image?.click();
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
      if (!commands.editDiagram) {
        return;
      }
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
          placeholder={t("Write a caption")}
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
      ...super.keys(),
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
