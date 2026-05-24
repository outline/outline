import { action, observable } from "mobx";
import { t } from "i18next";
import type { EditorState, Selection } from "prosemirror-state";
import { NodeSelection, Plugin, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { WidgetProps } from "@shared/editor/lib/Extension";
import Extension from "@shared/editor/lib/Extension";
import { isInNotice } from "@shared/editor/queries/isInNotice";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import type {
  MenuItem,
  SelectionContext,
  SelectionToolbarMenuDescriptor,
} from "@shared/editor/types";
import { CommentIcon } from "outline-icons";
import { SelectionToolbar } from "../components/SelectionToolbar";
import getFormattingMenuItems from "../menus/formatting";
import getTableColMenuItems from "../menus/tableCol";
import getTableRowMenuItems from "../menus/tableRow";

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

  /**
   * Returns all selection toolbar menu descriptors. Each descriptor declares
   * when it matches (via a predicate on SelectionContext) and what items to
   * show. The toolbar evaluates them in priority order and uses the first
   * match.
   *
   * @returns an array of selection toolbar menu descriptors.
   */
  selectionToolbarMenus(): SelectionToolbarMenuDescriptor[] {
    return [
      {
        id: "table-col",
        priority: 85,
        matches: (ctx) => ctx.colIndex !== undefined,
        getItems: (ctx) => getTableColMenuItems(ctx),
      },
      {
        id: "table-row",
        priority: 80,
        matches: (ctx) => ctx.rowIndex !== undefined,
        getItems: (ctx) => getTableRowMenuItems(ctx),
      },
      {
        id: "read-only",
        priority: 30,
        matches: (ctx) => ctx.readOnly,
        getItems: (ctx) => this.readOnlyMenuItems(ctx),
      },
      {
        id: "formatting",
        priority: 0,
        matches: () => true,
        getItems: (ctx) => getFormattingMenuItems(ctx),
      },
    ];
  }

  private readOnlyMenuItems(ctx: SelectionContext): MenuItem[] {
    const { schema } = ctx;
    return [
      {
        visible: (this.editor.props.canUpdate ?? false) && !ctx.isEmpty,
        name: "comment",
        tooltip: t("Comment"),
        label: t("Comment"),
        icon: <CommentIcon />,
        active: isMarkActive(schema.marks.comment),
      },
    ];
  }

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
      isNodeActive(schema.nodes.code_block)(state) ||
      isNodeActive(schema.nodes.code_fence)(state)
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

    const fragment = selection.content().content;

    for (let i = 0; i < fragment.childCount; i++) {
      if (fragment.child(i).content.size) {
        return selection;
      }
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
