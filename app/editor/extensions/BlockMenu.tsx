import { action } from "mobx";
import { PlusIcon } from "outline-icons";
import { Node, ResolvedPos } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import ReactDOM from "react-dom";
import { WidgetProps } from "@shared/editor/lib/Extension";
import { PlaceholderPlugin } from "@shared/editor/plugins/PlaceholderPlugin";
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
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
      new PlaceholderPlugin([
        {
          condition: (
            node: Node,
            $start: ResolvedPos,
            _parent: Node | null,
            state: EditorState
          ) =>
            $start.depth === 1 &&
            node.textContent === "" &&
            !!state.doc.textContent &&
            state.selection.$from.pos === $start.pos + node.content.size,
          text: this.options.dictionary.newLineEmpty,
        },
        {
          condition: (
            node: Node,
            $start: ResolvedPos,
            _parent: Node,
            state: EditorState
          ) =>
            $start.depth === 1 &&
            node.textContent === "/" &&
            state.selection.$from.pos === $start.pos + node.content.size,
          text: `  ${this.options.dictionary.newLineWithSlash}`,
        },
      ]),
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
