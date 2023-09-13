import { PlusIcon } from "outline-icons";
import { Plugin, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import * as React from "react";
import ReactDOM from "react-dom";
import { absoluteRect, nodeDOMAtCoords, nodePosAtDOM } from "../lib/position";
import { SuggestionsMenuType } from "../plugins/Suggestions";
import { findParentNode } from "../queries/findParentNode";
import { EventType } from "../types";
import Suggestion from "./Suggestion";

export default class BlockMenuTrigger extends Suggestion {
  get defaultOptions() {
    return {
      type: SuggestionsMenuType.Block,
      openRegex: /^\/(\w+)?$/,
      closeRegex: /(^(?!\/(\w+)?)(.*)$|^\/(([\w\W]+)\s.*|\s)$|^\/((\W)+)$)/,
    };
  }

  get name() {
    return "blockmenu";
  }

  get plugins() {
    let dragHandleElement: HTMLElement | null = null;

    function hideDragHandle() {
      if (dragHandleElement) {
        dragHandleElement.classList.add("hidden");
      }
    }

    function showDragHandle() {
      if (dragHandleElement) {
        dragHandleElement.classList.remove("hidden");
      }
    }

    const handleClick = (event: MouseEvent, view: EditorView) => {
      view.focus();

      const node = nodeDOMAtCoords({
        x: event.clientX + 50 + 24,
        y: event.clientY,
      });

      if (!(node instanceof Element)) {
        return;
      }

      const nodePos = nodePosAtDOM(node, view);
      if (!nodePos) {
        return;
      }

      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.near(view.state.doc.resolve(nodePos))
        )
      );

      this.editor.events.emit(EventType.SuggestionsMenuOpen, {
        type: SuggestionsMenuType.Block,
        query: "",
      });
    };

    return [
      ...super.plugins,
      new Plugin({
        view: (view) => {
          dragHandleElement = document.createElement("button");
          dragHandleElement.className = "block-menu-trigger";
          dragHandleElement.classList.add("block-menu-trigger");
          dragHandleElement.addEventListener("click", (e) =>
            handleClick(e, view)
          );

          ReactDOM.render(<PlusIcon />, dragHandleElement);

          view.dom.parentElement?.appendChild(dragHandleElement);

          return {
            destroy: () => {
              dragHandleElement?.remove();
            },
          };
        },
        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (!view.editable) {
                return;
              }

              const buttonWidth = 24;
              const node = nodeDOMAtCoords({
                x: event.clientX + 50 + buttonWidth,
                y: event.clientY,
              });

              if (!(node instanceof Element)) {
                hideDragHandle();
                return;
              }

              const isEmptyNode =
                node.tagName === "P" && node.textContent === "";
              if (!isEmptyNode) {
                return;
              }

              const style = window.getComputedStyle(node);
              const lineHeight = parseInt(style.lineHeight, 10);
              const paddingTop = parseInt(style.paddingTop, 10);
              const rect = absoluteRect(node);

              rect.top += (lineHeight - 24) / 2;
              rect.top += paddingTop;
              rect.width = buttonWidth;
              rect.left -= 20;

              if (!dragHandleElement) {
                return;
              }

              dragHandleElement.style.left = `${rect.left - rect.width}px`;
              dragHandleElement.style.top = `${rect.top}px`;
              showDragHandle();
            },
            keydown: hideDragHandle,
            mousewheel: hideDragHandle,
          },
          decorations: (state) => {
            const parent = findParentNode(
              (node) => node.type.name === "paragraph"
            )(state.selection);

            if (!parent) {
              return;
            }

            const isTopLevel = state.selection.$from.depth === 1;
            if (!isTopLevel) {
              return;
            }

            const decorations: Decoration[] = [];
            const isEmptyNode = parent && parent.node.content.size === 0;
            const isSlash = parent && parent.node.textContent === "/";
            const isEmptyDoc = state.doc.textContent === "";

            if (isEmptyNode && !isEmptyDoc) {
              decorations.push(
                Decoration.node(parent.pos, parent.pos + parent.node.nodeSize, {
                  class: "placeholder",
                  "data-empty-text": this.options.dictionary.newLineEmpty,
                })
              );
            } else if (isSlash) {
              decorations.push(
                Decoration.node(parent.pos, parent.pos + parent.node.nodeSize, {
                  class: "placeholder",
                  "data-empty-text": `  ${this.options.dictionary.newLineWithSlash}`,
                })
              );
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  }
}
