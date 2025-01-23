import { action } from "mobx";
import { PlusIcon } from "outline-icons";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import * as React from "react";
import ReactDOM from "react-dom";
import { WidgetProps } from "@shared/editor/lib/Extension";
import { findParentNode } from "@shared/editor/queries/findParentNode";
import Suggestion from "~/editor/extensions/Suggestion";
import BlockMenu from "../components/BlockMenu";

export default class BlockMenuExtension extends Suggestion {
  get defaultOptions() {
    return {
      trigger: "/",
      allowSpaces: false,
      requireSearchTerm: false,
      enabledInCode: false,
    };
  }

  get name() {
    return "block-menu";
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
                    button.addEventListener(
                      "click",
                      action(() => {
                        this.state.open = true;
                      })
                    );
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

  private handleClose = action((insertNewLine: boolean) => {
    const { view } = this.editor;

    if (insertNewLine) {
      const transaction = view.state.tr.split(view.state.selection.to);
      view.dispatch(transaction);
      view.focus();
    }

    this.state.open = false;
  });

  widget = ({ rtl }: WidgetProps) => {
    const { props } = this.editor;

    return (
      <BlockMenu
        rtl={rtl}
        trigger={this.options.trigger}
        isActive={this.state.open}
        search={this.state.query}
        onClose={this.handleClose}
        uploadFile={props.uploadFile}
        onFileUploadStart={props.onFileUploadStart}
        onFileUploadStop={props.onFileUploadStop}
        embeds={props.embeds}
      />
    );
  };
}
