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
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { getDataTransferFiles, getEventFiles } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import { AttachmentValidation } from "../../validations";
import insertFiles, { Options } from "../commands/insertFiles";
import ImageZoom from "../components/ImageZoom";
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

type DragDirection = "left" | "right";

const ImageComponent = (
  props: ComponentProps & {
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    onDownload: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onChangeSize: (props: { width: number; height?: number }) => void;
    children: React.ReactNode;
    view: EditorView;
  }
) => {
  const { isSelected, node, isEditable } = props;
  const { src, layoutClass } = node.attrs;
  const className = layoutClass ? `image image-${layoutClass}` : "image";
  const [contentWidth, setContentWidth] = React.useState(
    () => document.body.querySelector("#full-width-container")?.clientWidth || 0
  );
  const [naturalWidth, setNaturalWidth] = React.useState(node.attrs.width);
  const [naturalHeight, setNaturalHeight] = React.useState(node.attrs.height);
  const [size, setSize] = React.useState({
    width: node.attrs.width ?? naturalWidth,
    height: node.attrs.height ?? naturalHeight,
  });
  const [sizeAtDragStart, setSizeAtDragStart] = React.useState(size);
  const [offset, setOffset] = React.useState(0);
  const [dragging, setDragging] = React.useState<DragDirection>();
  const [documentWidth, setDocumentWidth] = React.useState(
    props.view?.dom.clientWidth || 0
  );
  const maxWidth = layoutClass ? documentWidth / 3 : documentWidth;
  const isFullWidth = layoutClass === "full-width";

  React.useLayoutEffect(() => {
    const handleResize = () => {
      const contentWidth =
        document.body.querySelector("#full-width-container")?.clientWidth || 0;
      setContentWidth(contentWidth);
      setDocumentWidth(props.view?.dom.clientWidth || 0);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [props.view]);

  const constrainWidth = (width: number) => {
    const minWidth = documentWidth * 0.1;
    return Math.round(Math.min(maxWidth, Math.max(width, minWidth)));
  };

  const handlePointerMove = (event: PointerEvent) => {
    event.preventDefault();

    let diff;
    if (dragging === "left") {
      diff = offset - event.pageX;
    } else {
      diff = event.pageX - offset;
    }

    const grid = documentWidth / 10;
    const newWidth = sizeAtDragStart.width + diff * 2;
    const widthOnGrid = Math.round(newWidth / grid) * grid;
    const constrainedWidth = constrainWidth(widthOnGrid);

    const aspectRatio = naturalHeight / naturalWidth;
    setSize({
      width: constrainedWidth,
      height: naturalWidth
        ? Math.round(constrainedWidth * aspectRatio)
        : undefined,
    });
  };

  const handlePointerUp = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setOffset(0);
    setDragging(undefined);
    props.onChangeSize(size);

    document.removeEventListener("mousemove", handlePointerMove);
  };

  const handlePointerDown = (dragging: "left" | "right") => (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSizeAtDragStart({
      width: constrainWidth(size.width),
      height: size.height,
    });
    setOffset(event.pageX);
    setDragging(dragging);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      setSize(sizeAtDragStart);
      setDragging(undefined);
    }
  };

  React.useEffect(() => {
    if (node.attrs.width && node.attrs.width !== size.width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
  }, [node.attrs.width]);

  React.useEffect(() => {
    if (dragging) {
      document.body.style.cursor = "ew-resize";
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      document.body.style.cursor = "initial";
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  const style = isFullWidth
    ? { width: contentWidth }
    : { width: size.width || "auto" };

  return (
    <div
      contentEditable={false}
      className={className}
      style={
        isFullWidth
          ? ({
              "--offset": `${-(contentWidth - documentWidth) / 2}px`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <ImageWrapper
        isFullWidth={isFullWidth}
        className={isSelected || dragging ? "ProseMirror-selectednode" : ""}
        onClick={dragging ? undefined : props.onClick}
        style={style}
      >
        {!dragging && size.width > 60 && size.height > 60 && (
          <Button onClick={props.onDownload}>
            <DownloadIcon color="currentColor" />
          </Button>
        )}
        <ImageZoom zoomMargin={24}>
          <img
            style={style}
            src={sanitizeUrl(src) ?? ""}
            onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
              // For some SVG's Firefox does not provide the naturalWidth, in this
              // rare case we need to provide a default so that the image can be
              // seen and is not sized to 0px
              const nw = (ev.target as HTMLImageElement).naturalWidth || 300;
              const nh = (ev.target as HTMLImageElement).naturalHeight;
              setNaturalWidth(nw);
              setNaturalHeight(nh);

              if (!node.attrs.width) {
                setSize((state) => ({
                  ...state,
                  width: nw,
                }));
              }
            }}
          />
        </ImageZoom>
        {isEditable && !isFullWidth && (
          <>
            <ResizeLeft
              onPointerDown={handlePointerDown("left")}
              $dragging={!!dragging}
            />
            <ResizeRight
              onPointerDown={handlePointerDown("right")}
              $dragging={!!dragging}
            />
          </>
        )}
      </ImageWrapper>
      {props.children}
    </div>
  );
};

const ResizeLeft = styled.div<{ $dragging: boolean }>`
  cursor: ew-resize;
  position: absolute;
  left: -4px;
  top: 0;
  bottom: 0;
  width: 8px;
  user-select: none;
  opacity: ${(props) => (props.$dragging ? 1 : 0)};
  transition: opacity 150ms ease-in-out;

  &:after {
    content: "";
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 15%;
    min-height: 20px;
    border-radius: 4px;
    background: ${(props) => props.theme.toolbarBackground};
    box-shadow: 0 0 0 1px ${(props) => props.theme.toolbarItem};
    opacity: 0.75;
  }
`;

const ResizeRight = styled(ResizeLeft)`
  left: initial;
  right: -4px;

  &:after {
    left: initial;
    right: 8px;
  }
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
  transition: opacity 150ms ease-in-out;

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

  ${breakpoint("tablet")`
    font-size: 13px;
  `};

  &:empty:not(:focus) {
    display: none;
  }

  &:empty:before {
    color: ${(props) => props.theme.placeholder};
    content: attr(data-caption);
    pointer-events: none;
  }
`;

const ImageWrapper = styled.div<{ isFullWidth: boolean }>`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: ${(props) => (props.isFullWidth ? "initial" : "100%")};
  transition-property: width, height;
  transition-duration: ${(props) => (props.isFullWidth ? "0ms" : "150ms")};
  transition-timing-function: ease-in-out;
  touch-action: none;
  overflow: hidden;

  img {
    transition-property: width, height;
    transition-duration: ${(props) => (props.isFullWidth ? "0ms" : "150ms")};
    transition-timing-function: ease-in-out;
  }

  &:hover {
    ${Button} {
      opacity: 0.9;
    }

    ${ResizeLeft}, ${ResizeRight} {
      opacity: 1;
    }
  }

  &.ProseMirror-selectednode + ${Caption} {
    display: block;
  }
`;
