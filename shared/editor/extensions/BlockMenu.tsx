import { PlusIcon } from "outline-icons";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import * as React from "react";
import ReactDOM from "react-dom";
import { SuggestionsMenuType } from "../plugins/Suggestions";
import { findParentNode } from "../queries/findParentNode";
import { EventType } from "../types";
import Suggestion from "./Suggestion";

export default class BlockMenu extends Suggestion {
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
    const button = document.createElement("button");
    button.className = "block-menu-trigger";
    button.type = "button";
    ReactDOM.render(<PlusIcon />, button);

    return [
      ...super.plugins,
      new Plugin({
        props: {
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

            if (isEmptyNode) {
              decorations.push(
                Decoration.widget(
                  parent.pos,
                  () => {
                    button.addEventListener("click", () => {
                      this.editor.events.emit(EventType.SuggestionsMenuOpen, {
                        type: SuggestionsMenuType.Block,
                        query: "",
                      });
                    });
                    return button;
                  },
                  {
                    key: "block-trigger",
                  }
                )
              );

              const isEmptyDoc = state.doc.textContent === "";
              if (!isEmptyDoc) {
                decorations.push(
                  Decoration.node(
                    parent.pos,
                    parent.pos + parent.node.nodeSize,
                    {
                      class: "placeholder",
                      "data-empty-text": this.options.dictionary.newLineEmpty,
                    }
                  )
                );
              }
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
