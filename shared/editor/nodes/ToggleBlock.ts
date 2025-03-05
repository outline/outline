import { wrapIn } from "prosemirror-commands";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import {
  Decoration,
  DecorationSource,
  EditorView,
  NodeView,
} from "prosemirror-view";
import { v4 } from "uuid";
import Node from "./Node";

export default class ToggleBlock extends Node {
  get name() {
    return "toggle_block";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      group: "block",
      attrs: {
        id: { default: undefined },
      },
      toDOM: () => [
        "div",
        { class: "toggle-block" },
        ["div", { class: "toggle-block-content" }, 0],
      ],
    };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          nodeViews: {
            [this.name]: (node, view, getPos, decorations, innerDecorations) =>
              new ToggleBlockView(
                node,
                view,
                getPos,
                decorations,
                innerDecorations
              ),
          },
        },
      }),
    ];
  }

  commands({ type }: { type: NodeType }) {
    return () => wrapIn(type);
  }
}

class ToggleBlockView implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLDivElement;

  constructor(
    node: ProsemirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
    _decorations: readonly Decoration[],
    _innerDecorations: DecorationSource
  ) {
    const button = document.createElement("button");
    button.className = "toggle-block-button";
    button.contentEditable = "false";
    button.innerHTML =
      '<svg fill="currentColor" width="12" height="24" viewBox="6 0 12 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.23823905,10.6097108 L11.207376,14.4695888 L11.207376,14.4695888 C11.54411,14.907343 12.1719566,14.989236 12.6097108,14.652502 C12.6783439,14.5997073 12.7398293,14.538222 12.792624,14.4695888 L15.761761,10.6097108 L15.761761,10.6097108 C16.0984949,10.1719566 16.0166019,9.54410997 15.5788477,9.20737601 C15.4040391,9.07290785 15.1896811,9 14.969137,9 L9.03086304,9 L9.03086304,9 C8.47857829,9 8.03086304,9.44771525 8.03086304,10 C8.03086304,10.2205442 8.10377089,10.4349022 8.23823905,10.6097108 Z" /></svg>';

    this.contentDOM = document.createElement("div");
    this.contentDOM.className = "toggle-block-content";

    this.dom = document.createElement("div");
    this.dom.className = "toggle-block";

    this.dom.appendChild(button);
    this.dom.appendChild(this.contentDOM);

    if (!node.attrs.id) {
      const tr = view.state.tr.setNodeAttribute(getPos()!, "id", v4());
      view.dispatch(tr);
    }
  }
}
