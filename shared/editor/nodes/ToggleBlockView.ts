import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorView, NodeView, DecorationSource } from "prosemirror-view";
import type { Decoration } from "prosemirror-view";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import {
  Action,
  toggleEventPluginKey,
  toggleFoldPluginKey,
} from "./ToggleBlock";

/**
 * Custom NodeView for toggle blocks that handles fold/unfold UI interactions.
 */
export class ToggleBlockView implements NodeView {
  dom: HTMLDivElement;
  contentDOM: HTMLDivElement;
  private button: HTMLButtonElement;
  private node: ProsemirrorNode;
  private view: EditorView;
  private getPos: () => number | undefined;
  private editorProps: Record<string, unknown>;
  private boundBroadcastFoldState: (event: StorageEvent) => void;

  constructor(
    node: ProsemirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
    decorations: readonly Decoration[],
    _innerDecorations: DecorationSource,
    editorProps: Record<string, unknown>
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.editorProps = editorProps;

    // Create DOM structure
    this.dom = document.createElement("div");
    this.dom.className = EditorStyleHelper.toggleBlock;

    this.button = document.createElement("button");
    this.button.className = EditorStyleHelper.toggleBlockButton;
    this.button.contentEditable = "false";
    this.button.innerHTML =
      '<svg fill="currentColor" width="12" height="24" viewBox="6 0 12 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.23823905,10.6097108 L11.207376,14.4695888 L11.207376,14.4695888 C11.54411,14.907343 12.1719566,14.989236 12.6097108,14.652502 C12.6783439,14.5997073 12.7398293,14.538222 12.792624,14.4695888 L15.761761,10.6097108 L15.761761,10.6097108 C16.0984949,10.1719566 16.0166019,9.54410997 15.5788477,9.20737601 C15.4040391,9.07290785 15.1896811,9 14.969137,9 L9.03086304,9 L9.03086304,9 C8.47857829,9 8.03086304,9.44771525 8.03086304,10 C8.03086304,10.2205442 8.10377089,10.4349022 8.23823905,10.6097108 Z" /></svg>';
    this.button.addEventListener("mousedown", this.handleToggle);

    this.contentDOM = document.createElement("div");
    this.contentDOM.className = EditorStyleHelper.toggleBlockContent;

    this.dom.appendChild(this.button);
    this.dom.appendChild(this.contentDOM);

    // Set initial fold state from decorations
    this.syncFoldState(decorations);

    // Listen for cross-tab storage changes
    this.boundBroadcastFoldState = this.broadcastFoldState.bind(this);
    window.addEventListener("storage", this.boundBroadcastFoldState);
  }

  private handleToggle = (event: MouseEvent) => {
    event.preventDefault();
    if (event.button !== 0) {
      return;
    }

    const pos = this.getPos();
    if (pos === undefined) {
      return;
    }

    const isFolded = this.dom.classList.contains(
      EditorStyleHelper.toggleBlockFolded
    );

    this.view.dispatch(
      this.view.state.tr
        .setMeta(toggleFoldPluginKey, {
          type: isFolded ? Action.UNFOLD : Action.FOLD,
          at: pos,
        })
        .setMeta(toggleEventPluginKey, {
          type: isFolded ? Action.UNFOLD : Action.FOLD,
          at: pos,
        })
    );
  };

  private broadcastFoldState(event: StorageEvent) {
    const key = `${this.node.attrs.id}:${this.editorProps.userId}`;
    if (event.key !== key || !event.newValue || !event.oldValue) {
      return;
    }

    const newFoldState = JSON.parse(event.newValue);
    const oldFoldState = JSON.parse(event.oldValue);

    if (newFoldState.fold !== oldFoldState.fold) {
      const pos = this.getPos();
      if (pos === undefined) {
        return;
      }

      this.view.dispatch(
        this.view.state.tr
          .setMeta(toggleFoldPluginKey, {
            type: newFoldState.fold ? Action.FOLD : Action.UNFOLD,
            at: pos,
          })
          .setMeta(toggleEventPluginKey, {
            type: newFoldState.fold ? Action.FOLD : Action.UNFOLD,
            at: pos,
          })
      );
    }
  }

  private syncFoldState(decorations: readonly Decoration[]) {
    const isFolded = decorations.some((d) => d.spec.fold === true);
    this.dom.classList.toggle(EditorStyleHelper.toggleBlockFolded, isFolded);
  }

  update(node: ProsemirrorNode, decorations: readonly Decoration[]) {
    if (node.type !== this.node.type) {
      return false;
    }
    this.node = node;
    this.syncFoldState(decorations);
    return true;
  }

  destroy() {
    this.button.removeEventListener("mousedown", this.handleToggle);
    window.removeEventListener("storage", this.boundBroadcastFoldState);
  }
}
