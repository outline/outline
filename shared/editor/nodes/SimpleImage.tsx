import { Token } from "markdown-it";
import { InputRule } from "prosemirror-inputrules";
import { Node as ProsemirrorNode, NodeSpec, NodeType } from "prosemirror-model";
import { TextSelection, NodeSelection, Command } from "prosemirror-state";
import * as React from "react";
import { Primitive } from "utility-types";
import { getEventFiles } from "../../utils/files";
import { sanitizeUrl } from "../../utils/urls";
import { AttachmentValidation } from "../../validations";
import insertFiles, { Options } from "../commands/insertFiles";
import { default as ImageComponent } from "../components/Image";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import uploadPlaceholderPlugin from "../lib/uploadPlaceholder";
import { UploadPlugin } from "../plugins/UploadPlugin";
import { ComponentProps } from "../types";
import Node from "./Node";

export default class SimpleImage extends Node {
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
        alt: {
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
            return {
              src: img?.getAttribute("src"),
              alt: img?.getAttribute("alt"),
              title: img?.getAttribute("title"),
            };
          },
        },
        {
          tag: "img",
          getAttrs: (dom: HTMLImageElement) => ({
            src: dom.getAttribute("src"),
            alt: dom.getAttribute("alt"),
            title: dom.getAttribute("title"),
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: "image",
        },
        [
          "img",
          {
            ...node.attrs,
            src: sanitizeUrl(node.attrs.src),
            contentEditable: "false",
          },
        ],
      ],
    };
  }

  handleSelect =
    ({ getPos }: { getPos: () => number }) =>
    (event: React.MouseEvent) => {
      event.preventDefault();

      const { view } = this.editor;
      const $pos = view.state.doc.resolve(getPos());
      const transaction = view.state.tr.setSelection(new NodeSelection($pos));
      view.dispatch(transaction);
      view.focus();
    };

  component = (props: ComponentProps) => (
    <ImageComponent {...props} onClick={this.handleSelect(props)} />
  );

  keys(): Record<string, Command> {
    return {
      Enter: (state, dispatch) => {
        const { selection } = state;
        if (
          selection instanceof NodeSelection &&
          selection.node?.type.name === this.name
        ) {
          const tr = state.tr;
          if (dispatch) {
            dispatch(
              tr
                .insert(selection.to, state.schema.nodes.paragraph.create({}))
                .setSelection(
                  TextSelection.near(tr.doc.resolve(selection.to + 2), 1)
                )
                .scrollIntoView()
            );
          }
          return true;
        }

        return false;
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(
      " ![" +
        state.esc((node.attrs.alt || "").replace("\n", "") || "", false) +
        "](" +
        state.esc(node.attrs.src || "", false) +
        ")"
    );
  }

  parseMarkdown() {
    return {
      node: "image",
      getAttrs: (token: Token) => ({
        src: token.attrGet("src"),
        alt:
          (token?.children && token.children[0] && token.children[0].content) ||
          null,
      }),
    };
  }

  commands({ type }: { type: NodeType }) {
    return {
      deleteImage: (): Command => (state, dispatch) => {
        dispatch?.(state.tr.deleteSelection());
        return true;
      },
      replaceImage: (): Command => (state) => {
        if (!(state.selection instanceof NodeSelection)) {
          return false;
        }
        const { view } = this.editor;
        const { node } = state.selection;
        const { uploadFile, onFileUploadStart, onFileUploadStop } =
          this.editor.props;

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
          void insertFiles(view, event, state.selection.from, files, {
            uploadFile,
            onFileUploadStart,
            onFileUploadStop,
            dictionary: this.options.dictionary,
            replaceExisting: true,
            attrs: {
              width: node.attrs.width,
            },
          });
        };
        inputElement.click();
        return true;
      },
      createImage:
        (attrs: Record<string, Primitive>): Command =>
        (state, dispatch) => {
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
          dispatch?.(transaction);
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
        const [okay, alt, src] = match;
        const { tr } = state;

        if (okay) {
          tr.replaceWith(
            start - 1,
            end,
            type.create({
              src,
              alt,
            })
          );
        }

        return tr;
      }),
    ];
  }

  get plugins() {
    return [uploadPlaceholderPlugin, new UploadPlugin(this.options)];
  }
}
