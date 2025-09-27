import { InputRule } from "prosemirror-inputrules";
import { Node as ProsemirrorNode, NodeSpec, NodeType } from "prosemirror-model";
import { NodeSelection, Plugin, Command, TextSelection } from "prosemirror-state";
import * as React from "react";
import Caption from "../components/Caption";
import ExcalidrawComponent from "../components/Excalidraw";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { ComponentProps } from "../types";
import ReactNode from "./ReactNode";

export default class Excalidraw extends ReactNode {
  get name() {
    return "excalidraw";
  }

  get schema(): NodeSpec {
    return {
      inline: false,
      block: true,
      attrs: {
        id: {
          default: "",
          validate: "string",
        },
        data: {
          default: null,
          validate: "object|null",
        },
        svg: {
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
      },
      content: "text*",
      marks: "",
      group: "block",
      selectable: true,
      draggable: false,
      atom: true,
      parseDOM: [
        {
          tag: "div[class~=excalidraw]",
          getAttrs: (dom: HTMLDivElement) => {
            const svg = dom.querySelector("svg");
            const dataEl = dom.querySelector("[data-excalidraw-data]");
            const data = dataEl ? JSON.parse(dataEl.getAttribute("data-excalidraw-data") || "null") : null;

            return {
              id: dom.getAttribute("data-id") || "",
              data,
              svg: svg ? svg.outerHTML : "",
              width: parseInt(dom.getAttribute("data-width") || "0", 10) || undefined,
              height: parseInt(dom.getAttribute("data-height") || "0", 10) || undefined,
              alt: dom.getAttribute("data-alt") || null,
            };
          },
        },
      ],
      toDOM: (node) => {
        const { id, data, svg, width, height, alt } = node.attrs;

        const children = [];

        if (svg) {
          children.push([
            "div",
            {
              class: "excalidraw-svg-container",
              style: width && height ? `width: ${width}px; height: ${height}px;` : undefined,
            },
            ["div", { innerHTML: svg }],
          ]);
        } else {
          // Placeholder when no drawing exists
          children.push([
            "div",
            {
              class: "excalidraw-placeholder",
              style: "min-height: 200px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #666;",
            },
            "Click to create a drawing",
          ]);
        }

        // Hidden data storage
        if (data) {
          children.push([
            "script",
            {
              type: "application/json",
              "data-excalidraw-data": JSON.stringify(data),
            },
          ]);
        }

        if (alt) {
          children.push([
            "p",
            { class: "excalidraw-caption" },
            alt,
          ]);
        }

        return [
          "div",
          {
            class: "excalidraw",
            "data-id": id,
            "data-width": width,
            "data-height": height,
            "data-alt": alt,
            contentEditable: "false",
          },
          ...children,
        ];
      },
      leafText: (node) =>
        node.attrs.alt ? `(excalidraw: ${node.attrs.alt})` : "(excalidraw)",
    };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleDoubleClick: (view, pos, _event) => {
            const { state } = view;
            const { doc } = state;
            const $pos = doc.resolve(pos);
            const node = $pos.node();

            if (node.type.name === "excalidraw") {
              // Open Excalidraw editor
              const excalidrawComponent = document.querySelector(
                `.ProseMirror .excalidraw[data-id="${node.attrs.id}"]`
              );
              if (excalidrawComponent) {
                const event = new CustomEvent("openExcalidraw", {
                  detail: { node, pos },
                });
                excalidrawComponent.dispatchEvent(event);
              }
              return true;
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
      commands["resizeExcalidraw"]({
        width,
        height: height || node.attrs.height,
      });
    };

  handleCaptionKeyDown =
    ({ node, getPos }: ComponentProps) =>
    (event: React.KeyboardEvent<HTMLParagraphElement>) => {
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

      const pos = getPos();
      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        alt: caption,
      });
      view.dispatch(transaction);
    };

  handleEdit =
    ({ _node, _getPos }: ComponentProps) =>
    () => {
      // This will be called when the user clicks to edit
    };

  handleUpdateData =
    ({ node, getPos }: ComponentProps) =>
    (newData: { elements: unknown[]; appState: unknown; svg: string }) => {
      const { view } = this.editor;
      const { tr } = view.state;

      const pos = getPos();
      const transaction = tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        data: {
          type: "excalidraw",
          version: 2,
          source: "",
          elements: newData.elements,
          appState: newData.appState,
        },
        svg: newData.svg,
        width: node.attrs.width || 600,
        height: node.attrs.height || 400,
      });
      view.dispatch(transaction);
    };

  component = (props: ComponentProps) => {
    // Try to get Y.doc from editor options for collaboration
    const yDoc = this.editor?.options?.collaboration?.document;

    return (
      <ExcalidrawComponent
        {...props}
        onEdit={this.handleEdit(props)}
        onUpdateData={this.handleUpdateData(props)}
        onChangeSize={this.handleChangeSize(props)}
        yDoc={yDoc}
      >
        <Caption
          width={props.node.attrs.width}
          onBlur={this.handleCaptionBlur(props)}
          onKeyDown={this.handleCaptionKeyDown(props)}
          isSelected={props.isSelected}
          placeholder={this.options.dictionary.excalidrawCaptionPlaceholder || "Add a caption..."}
        >
          {props.node.attrs.alt}
        </Caption>
      </ExcalidrawComponent>
    );
  };

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    // Serialize as a code block with excalidraw type
    const data = node.attrs.data ? JSON.stringify(node.attrs.data, null, 2) : "";
    state.write("```excalidraw\n");
    state.write(data);
    state.write("\n```\n");
  }

  parseMarkdown() {
    return {
      block: "excalidraw",
      getAttrs: (token: unknown) => {
        try {
          const data = JSON.parse(token.content);
          return {
            id: data.id || `excalidraw-${Date.now()}`,
            data,
            svg: "",
            alt: data.alt || null,
          };
        } catch {
          return {
            id: `excalidraw-${Date.now()}`,
            data: null,
            svg: "",
            alt: null,
          };
        }
      },
    };
  }

  commands({ type }: { type: NodeType }) {
    return {
      createExcalidraw: (): Command => (state, dispatch) => {
        const id = `excalidraw-${Date.now()}`;
        const node = type.create({
          id,
          data: {
            type: "excalidraw",
            version: 2,
            source: "",
            elements: [],
            appState: {
              gridSize: null,
              viewBackgroundColor: "#ffffff",
            },
          },
          svg: "",
          alt: null,
        });

        if (dispatch) {
          const { tr } = state;
          tr.replaceSelectionWith(node);
          dispatch(tr);
        }

        return true;
      },
      resizeExcalidraw:
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
    };
  }

  inputRules({ type }: { type: NodeType }) {
    const EXCALIDRAW_INPUT_REGEX = /^```excalidraw$/;

    return [
      new InputRule(EXCALIDRAW_INPUT_REGEX, (state, match, start, end) => {
        const { tr } = state;
        const id = `excalidraw-${Date.now()}`;

        if (match) {
          tr.replaceWith(
            start,
            end,
            type.create({
              id,
              data: {
                type: "excalidraw",
                version: 2,
                source: "",
                elements: [],
                appState: {
                  gridSize: null,
                  viewBackgroundColor: "#ffffff",
                },
              },
              svg: "",
              alt: null,
            })
          );
        }

        return tr;
      }),
    ];
  }
}