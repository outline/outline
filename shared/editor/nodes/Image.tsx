import Token from "markdown-it/lib/token";
import { InputRule } from "prosemirror-inputrules";
import { Node as ProsemirrorNode, NodeSpec, NodeType } from "prosemirror-model";
import { TextSelection, NodeSelection, EditorState } from "prosemirror-state";
import * as React from "react";
import { getEventFiles } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import { AttachmentValidation } from "../../validations";
import insertFiles, { Options } from "../commands/insertFiles";
import { default as ImageComponent, Caption } from "../components/Image";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import uploadPlaceholderPlugin from "../lib/uploadPlaceholder";
import uploadPlugin from "../lib/uploadPlugin";
import { ComponentProps, Dispatch } from "../types";
import Node from "./Node";

const IMAGE_CLASSES = ["right-50", "left-50", "full-width"];
const imageSizeRegex = /\s=(\d+)?x(\d+)?$/;

type TitleAttributes = {
  layoutClass?: string;
  title?: string;
  width?: number;
  height?: number;
};

const getLayoutAndTitle = (tokenTitle: string): TitleAttributes => {
  const attributes: TitleAttributes = {
    layoutClass: undefined,
    title: undefined,
    width: undefined,
    height: undefined,
  };
  if (!tokenTitle) {
    return attributes;
  }

  IMAGE_CLASSES.map((className) => {
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

export default class Image extends Node {
  options: Options;

  get name() {
    return "image";
  }

  get schema(): NodeSpec {
    return {
      inline: true,
      attrs: {
        src: {
          default: "",
        },
        width: {
          default: undefined,
        },
        height: {
          default: undefined,
        },
        alt: {
          default: null,
        },
        layoutClass: {
          default: null,
        },
        title: {
          default: null,
        },
      },
      content: "text*",
      marks: "",
      group: "inline",
      selectable: true,
      draggable: true,
      parseDOM: [
        {
          tag: "div[class~=image]",
          getAttrs: (dom: HTMLDivElement) => {
            const img = dom.getElementsByTagName("img")[0];
            const className = dom.className;
            const layoutClassMatched =
              className && className.match(/image-(.*)$/);
            const layoutClass = layoutClassMatched
              ? layoutClassMatched[1]
              : null;

            const width = img.getAttribute("width");
            const height = img.getAttribute("height");
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
        return [
          "div",
          {
            class: className,
          },
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
          ["p", { class: "caption" }, 0],
        ];
      },
    };
  }

  handleKeyDown = ({
    node,
    getPos,
  }: {
    node: ProsemirrorNode;
    getPos: () => number;
  }) => (event: React.KeyboardEvent<HTMLSpanElement>) => {
    // Pressing Enter in the caption field should move the cursor/selection
    // below the image
    if (event.key === "Enter") {
      event.preventDefault();

      const { view } = this.editor;
      const $pos = view.state.doc.resolve(getPos() + node.nodeSize);
      view.dispatch(
        view.state.tr.setSelection(new TextSelection($pos)).split($pos.pos)
      );
      view.focus();
      return;
    }

    // Pressing Backspace in an an empty caption field should remove the entire
    // image, leaving an empty paragraph
    if (event.key === "Backspace" && event.currentTarget.innerText === "") {
      const { view } = this.editor;
      const $pos = view.state.doc.resolve(getPos());
      const tr = view.state.tr.setSelection(new NodeSelection($pos));
      view.dispatch(tr.deleteSelection());
      view.focus();
      return;
    }
  };

  handleBlur = ({
    node,
    getPos,
  }: {
    node: ProsemirrorNode;
    getPos: () => number;
  }) => (event: React.FocusEvent<HTMLSpanElement>) => {
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

  handleSelect = ({ getPos }: { getPos: () => number }) => (
    event: React.MouseEvent
  ) => {
    event.preventDefault();

    const { view } = this.editor;
    const $pos = view.state.doc.resolve(getPos());
    const transaction = view.state.tr.setSelection(new NodeSelection($pos));
    view.dispatch(transaction);
  };

  handleChangeSize = ({
    node,
    getPos,
  }: {
    node: ProsemirrorNode;
    getPos: () => number;
  }) => ({ width, height }: { width: number; height?: number }) => {
    const { view } = this.editor;
    const { tr } = view.state;

    const pos = getPos();
    const transaction = tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      width,
      height,
    });
    const $pos = transaction.doc.resolve(getPos());
    view.dispatch(transaction.setSelection(new NodeSelection($pos)));
  };

  handleDownload = ({ node }: { node: ProsemirrorNode }) => (
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    downloadImageNode(node);
  };

  handleMouseDown = (ev: React.MouseEvent<HTMLParagraphElement>) => {
    if (document.activeElement !== ev.currentTarget) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.currentTarget.focus();
    }
  };

  component = (props: ComponentProps) => {
    return (
      <ImageComponent
        {...props}
        onClick={this.handleSelect(props)}
        onDownload={this.handleDownload(props)}
        onChangeSize={this.handleChangeSize(props)}
      >
        <Caption
          onKeyDown={this.handleKeyDown(props)}
          onBlur={this.handleBlur(props)}
          onMouseDown={this.handleMouseDown}
          className="caption"
          tabIndex={-1}
          role="textbox"
          contentEditable
          suppressContentEditableWarning
          data-caption={this.options.dictionary.imageCaptionPlaceholder}
        >
          {props.node.attrs.alt}
        </Caption>
      </ImageComponent>
    );
  };

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    let markdown =
      " ![" +
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
      getAttrs: (token: Token) => {
        return {
          src: token.attrGet("src"),
          alt:
            (token?.children &&
              token.children[0] &&
              token.children[0].content) ||
            null,
          ...getLayoutAndTitle(token?.attrGet("title") || ""),
        };
      },
    };
  }

  commands({ type }: { type: NodeType }) {
    return {
      downloadImage: () => (state: EditorState) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const { node } = state.selection;

        if (node.type.name !== "image") {
          return false;
        }

        downloadImageNode(node);

        return true;
      },
      deleteImage: () => (state: EditorState, dispatch: Dispatch) => {
        dispatch(state.tr.deleteSelection());
        return true;
      },
      alignRight: () => (state: EditorState, dispatch: Dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const attrs = {
          ...state.selection.node.attrs,
          title: null,
          layoutClass: "right-50",
        };
        const { selection } = state;
        dispatch(state.tr.setNodeMarkup(selection.from, undefined, attrs));
        return true;
      },
      alignLeft: () => (state: EditorState, dispatch: Dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const attrs = {
          ...state.selection.node.attrs,
          title: null,
          layoutClass: "left-50",
        };
        const { selection } = state;
        dispatch(state.tr.setNodeMarkup(selection.from, undefined, attrs));
        return true;
      },
      alignFullWidth: () => (state: EditorState, dispatch: Dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const attrs = {
          ...state.selection.node.attrs,
          title: null,
          layoutClass: "full-width",
        };
        const { selection } = state;
        dispatch(state.tr.setNodeMarkup(selection.from, undefined, attrs));
        return true;
      },
      replaceImage: () => (state: EditorState) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const { view } = this.editor;
        const { node } = state.selection;
        const {
          uploadFile,
          onFileUploadStart,
          onFileUploadStop,
          onShowToast,
        } = this.editor.props;

        if (!uploadFile) {
          throw new Error("uploadFile prop is required to replace images");
        }

        if (node.type.name !== "image") {
          return false;
        }

        // create an input element and click to trigger picker
        const inputElement = document.createElement("input");
        inputElement.type = "file";
        inputElement.accept = AttachmentValidation.imageContentTypes.join(", ");
        inputElement.onchange = (event) => {
          const files = getEventFiles(event);
          insertFiles(view, event, state.selection.from, files, {
            uploadFile,
            onFileUploadStart,
            onFileUploadStop,
            onShowToast,
            dictionary: this.options.dictionary,
            replaceExisting: true,
            width: node.attrs.width,
          });
        };
        inputElement.click();
        return true;
      },
      alignCenter: () => (state: EditorState, dispatch: Dispatch) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const attrs = { ...state.selection.node.attrs, layoutClass: null };
        const { selection } = state;
        dispatch(state.tr.setNodeMarkup(selection.from, undefined, attrs));
        return true;
      },
      createImage: (attrs: Record<string, any>) => (
        state: EditorState,
        dispatch: Dispatch
      ) => {
        const { selection } = state;
        const position =
          selection instanceof TextSelection
            ? selection.$cursor?.pos
            : selection.$to.pos;
        if (position === undefined) {
          return false;
        }

        const node = type.create(attrs);
        const transaction = state.tr.insert(position, node);
        dispatch(transaction);
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
    const IMAGE_INPUT_REGEX = /!\[(?<alt>[^\][]*?)]\((?<filename>[^\][]*?)(?=“|\))“?(?<layoutclass>[^\][”]+)?”?\)$/;

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
              ...getLayoutAndTitle(matchedTitle),
            })
          );
        }

        return tr;
      }),
    ];
  }

  get plugins() {
    return [uploadPlaceholderPlugin, uploadPlugin(this.options)];
  }
}
