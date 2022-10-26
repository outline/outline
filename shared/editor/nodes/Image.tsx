import Token from "markdown-it/lib/token";
import { DownloadIcon } from "outline-icons";
import { InputRule } from "prosemirror-inputrules";
import { Node as ProsemirrorNode, NodeSpec, NodeType } from "prosemirror-model";
import {
  Plugin,
  TextSelection,
  NodeSelection,
  EditorState,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import ImageZoom, { ImageZoom_Image } from "react-medium-image-zoom";
import styled from "styled-components";
import { getDataTransferFiles, getEventFiles } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import { AttachmentValidation } from "../../validations";
import insertFiles, { Options } from "../commands/insertFiles";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import uploadPlaceholderPlugin from "../lib/uploadPlaceholder";
import { ComponentProps, Dispatch } from "../types";
import Node from "./Node";

/**
 * Matches following attributes in Markdown-typed image: [, alt, src, class]
 *
 * Example:
 * ![Lorem](image.jpg) -> [, "Lorem", "image.jpg"]
 * ![](image.jpg "class") -> [, "", "image.jpg", "small"]
 * ![Lorem](image.jpg "class") -> [, "Lorem", "image.jpg", "small"]
 */
const IMAGE_INPUT_REGEX = /!\[(?<alt>[^\][]*?)]\((?<filename>[^\][]*?)(?=“|\))“?(?<layoutclass>[^\][”]+)?”?\)$/;

const uploadPlugin = (options: Options) =>
  new Plugin({
    props: {
      handleDOMEvents: {
        paste(view, event: ClipboardEvent): boolean {
          if (
            (view.props.editable && !view.props.editable(view.state)) ||
            !options.uploadFile
          ) {
            return false;
          }

          if (!event.clipboardData) {
            return false;
          }

          // check if we actually pasted any files
          const files = Array.prototype.slice
            .call(event.clipboardData.items)
            .filter((dt: DataTransferItem) => dt.kind !== "string")
            .map((dt: DataTransferItem) => dt.getAsFile())
            .filter(Boolean);

          if (files.length === 0) {
            return false;
          }

          const { tr } = view.state;
          if (!tr.selection.empty) {
            tr.deleteSelection();
          }
          const pos = tr.selection.from;

          insertFiles(view, event, pos, files, options);
          return true;
        },
        drop(view, event: DragEvent): boolean {
          if (
            (view.props.editable && !view.props.editable(view.state)) ||
            !options.uploadFile
          ) {
            return false;
          }

          // filter to only include image files
          const files = getDataTransferFiles(event);
          if (files.length === 0) {
            return false;
          }

          // grab the position in the document for the cursor
          const result = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (result) {
            insertFiles(view, event, result.pos, files, options);
            return true;
          }

          return false;
        },
      },
    },
  });

const IMAGE_CLASSES = ["right-50", "left-50"];
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

  if (IMAGE_CLASSES.includes(tokenTitle)) {
    attributes.layoutClass = tokenTitle;
    IMAGE_CLASSES.map((className) => {
      tokenTitle = tokenTitle.replace(className, "");
    });
  }

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
        src: {},
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
            return {
              src: img?.getAttribute("src"),
              alt: img?.getAttribute("alt"),
              width: img?.getAttribute("width"),
              height: img?.getAttribute("height"),
              title: img?.getAttribute("title"),
              layoutClass,
            };
          },
        },
        {
          tag: "img",
          getAttrs: (dom: HTMLImageElement) => {
            return {
              src: dom.getAttribute("src"),
              width: dom.getAttribute("width"),
              height: dom.getAttribute("height"),
              alt: dom.getAttribute("alt"),
              title: dom.getAttribute("title"),
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
    const alt = event.currentTarget.innerText;
    const { src, title, layoutClass } = node.attrs;

    if (alt === node.attrs.alt) {
      return;
    }

    const { view } = this.editor;
    const { tr } = view.state;

    // update meta on object
    const pos = getPos();
    const transaction = tr.setNodeMarkup(pos, undefined, {
      src,
      alt,
      title,
      layoutClass,
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

  handleChangeSize = ({ getPos }: { getPos: () => number }) => ({
    width,
  }: {
    width: number;
    height: number;
  }) => {
    const { view } = this.editor;
    const { tr } = view.state;

    const pos = getPos();
    const node = view.state.doc.nodeAt(pos);
    if (node) {
      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        width,
      });
      console.log({
        ...node.attrs,
        width,
      });
      view.dispatch(transaction);
    }
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
        view={this.editor.view}
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
    } else {
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
      replaceImage: () => (state: EditorState) => {
        const { view } = this.editor;
        const {
          uploadFile,
          onFileUploadStart,
          onFileUploadStop,
          onShowToast,
        } = this.editor.props;

        if (!uploadFile) {
          throw new Error("uploadFile prop is required to replace images");
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

const ImageComponent = (
  props: ComponentProps & {
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    onDownload: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onChangeSize: (props: { width: number; height: number }) => void;
    children: React.ReactNode;
    view: EditorView;
  }
) => {
  const { theme, isSelected, node } = props;
  const { alt, src, layoutClass } = node.attrs;
  const className = layoutClass ? `image image-${layoutClass}` : "image";
  const [naturalWidth, setNaturalWidth] = React.useState(node.attrs.width);
  const [widthAtDragStart, setWidthAtDragStart] = React.useState(naturalWidth);
  const [width, setWidth] = React.useState(node.attrs.width ?? naturalWidth);
  const [offset, setOffset] = React.useState(0);
  const [direction, setDirection] = React.useState<"left" | "right">();
  const documentWidth = props.view?.dom.clientWidth;

  const handleMouseMove = (event: MouseEvent) => {
    event.preventDefault();

    let diff;
    if (direction === "left") {
      diff = offset - event.pageX;
    } else {
      diff = event.pageX - offset;
    }

    const grid = documentWidth / 10;
    const minWidth = widthAtDragStart * 0.1;
    const newWidth = widthAtDragStart + diff * 2;
    const widthOnGrid = Math.round(newWidth / grid) * grid;
    const constrainedWidth = Math.round(
      Math.min(Math.max(widthOnGrid, minWidth), documentWidth)
    );

    setWidth(constrainedWidth);
  };

  const handleMouseUp = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setOffset(0);
    setDirection(undefined);
    props.onChangeSize({ width });

    document.removeEventListener("mousemove", handleMouseMove);
  };

  const handleMouseDown = (direction: "left" | "right") => (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setWidthAtDragStart(width);
    setOffset(event.pageX);
    setDirection(direction);
  };

  React.useEffect(() => {
    if (node.attrs.width !== width) {
      setWidth(node.attrs.width);
    }
  }, [node.attrs.width]);

  React.useEffect(() => {
    if (direction) {
      document.body.style.cursor = "ew-resize";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.body.style.cursor = "initial";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction, handleMouseMove, handleMouseUp]);

  return (
    <div contentEditable={false} className={className}>
      <ImageWrapper
        className={isSelected && !direction ? "ProseMirror-selectednode" : ""}
        onClick={direction ? undefined : props.onClick}
        style={{ width: width || "auto" }}
      >
        {!direction && (
          <Button onClick={props.onDownload}>
            <DownloadIcon color="currentColor" />
          </Button>
        )}
        <ImageZoom
          image={
            {
              style: { width: width || "auto" },
              src: sanitizeUrl(src) ?? "",
              alt,
              onLoad: (ev: React.SyntheticEvent<HTMLImageElement>) => {
                // For some SVG's Firefox does not provide the naturalWidth, in this
                // rare case we need to provide a default so that the image can be
                // seen and is not sized to 0px
                const value =
                  (ev.target as HTMLImageElement).naturalWidth || 300;
                setNaturalWidth(value);
                setWidth(value);
              },
            } as ImageZoom_Image
          }
          defaultStyles={{
            overlay: {
              backgroundColor: theme.background,
            },
          }}
          shouldRespectMaxDimension
        />
        <ResizeLeft onMouseDown={handleMouseDown("left")} />
        <ResizeRight onMouseDown={handleMouseDown("right")} />
      </ImageWrapper>
      {props.children}
    </div>
  );
};

const ResizeLeft = styled.div`
  cursor: ew-resize;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  user-select: none;
`;

const ResizeRight = styled(ResizeLeft)`
  left: initial;
  right: 0;
`;

const Button = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  border: 0;
  margin: 0;
  padding: 0;
  border-radius: 4px;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.textSecondary};
  width: 24px;
  height: 24px;
  display: inline-block;
  cursor: var(--pointer);
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  &:active {
    transform: scale(0.98);
  }

  &:hover {
    color: ${(props) => props.theme.text};
    opacity: 1;
  }
`;

const Caption = styled.p`
  border: 0;
  display: block;
  font-size: 13px;
  font-style: italic;
  font-weight: normal;
  color: ${(props) => props.theme.textSecondary};
  padding: 8px 0 4px;
  line-height: 16px;
  text-align: center;
  min-height: 1em;
  outline: none;
  background: none;
  resize: none;
  user-select: text;
  margin: 0 !important;
  cursor: text;

  &:empty:not(:focus) {
    display: none;
  }

  &:empty:before {
    color: ${(props) => props.theme.placeholder};
    content: attr(data-caption);
    pointer-events: none;
  }
`;

const ImageWrapper = styled.div`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: 150%;
  transition: all 150ms ease-in-out;

  &:hover {
    ${Button} {
      opacity: 0.9;
    }
  }

  &.ProseMirror-selectednode + ${Caption} {
    display: block;
  }
`;
