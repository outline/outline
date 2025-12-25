import some from "lodash/some";
import { action, observable } from "mobx";
import type { EditorState, Selection } from "prosemirror-state";
import { NodeSelection, Plugin, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { WidgetProps } from "@shared/editor/lib/Extension";
import Extension from "@shared/editor/lib/Extension";
import { isInNotice } from "@shared/editor/queries/isInNotice";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import { SelectionToolbar } from "../components/SelectionToolbar";

export default class SelectionToolbarExtension extends Extension {
  get name() {
    return "selection-toolbar";
  }

  get allowInReadOnly() {
    return true;
  }

  get plugins(): Plugin[] {
    return [
      new Plugin({
        view: () => ({
          update: this.handleUpdate,
        }),
      }),
    ];
  }

  @observable
  state: Selection | boolean = false;

  private handleUpdate = action((view: EditorView) => {
    const { state } = view;
    this.state = this.calculateState(state);
  });

  private calculateState(state: EditorState): Selection | boolean {
    const { selection, doc, schema } = state;

    if (isMarkActive(schema.marks.link)(state)) {
      return selection;
    }

    if (
      (isNodeActive(schema.nodes.code_block)(state) ||
        isNodeActive(schema.nodes.code_fence)(state)) &&
      selection.from > 0
    ) {
      return selection;
    }

    if (isInNotice(state) && selection.from > 0) {
      return selection;
    }

    if (!selection || selection.empty) {
      return false;
    }

    if (
      selection instanceof NodeSelection &&
      selection.node.type.name === "hr"
    ) {
      return selection;
    }

    if (
      selection instanceof NodeSelection &&
      ["image", "attachment", "embed"].includes(selection.node.type.name)
    ) {
      return selection;
    }

    if (selection instanceof NodeSelection) {
      return false;
    }

    const selectionText = doc.cut(selection.from, selection.to).textContent;
    if (selection instanceof TextSelection && !selectionText) {
      return false;
    }

    const slice = selection.content();
    const fragment = slice.content;
    const nodes = (fragment as any).content;

    if (some(nodes, (n) => n.content.size)) {
      return selection;
    }

    return false;
  }

  widget = (props: WidgetProps) => {
    const editorProps = this.editor.props;

    return (
      <SelectionToolbar
        {...props}
        isActive={!!this.state}
        selection={this.state ? (this.state as Selection) : undefined}
        canUpdate={editorProps.canUpdate}
        canComment={editorProps.canComment}
        isTemplate={editorProps.template === true}
      />
    );
  };
}
