import { action, observable } from "mobx";
import type { EditorState, Selection } from "prosemirror-state";
import { NodeSelection, Plugin, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { WidgetProps } from "@shared/editor/lib/Extension";
import Extension from "@shared/editor/lib/Extension";
import { isInNotice } from "@shared/editor/queries/isInNotice";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import { isNodeActive } from "@shared/editor/queries/isNodeActive";
import {
  MenuType,
  type SelectionToolbarMenuDescriptor,
} from "@shared/editor/types";
import { SelectionToolbar } from "../components/SelectionToolbar";
import getAttachmentMenuItems from "../menus/attachment";
import getCodeMenuItems from "../menus/code";

import getFormattingMenuItems from "../menus/formatting";
import getImageMenuItems from "../menus/image";
import getNoticeMenuItems from "../menus/notice";
import getReadOnlyMenuItems from "../menus/readOnly";
import getTableMenuItems from "../menus/table";
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
        priority: 100,
        align: "end",
        sticky: true,
        matches: (ctx) =>
          ctx.isInCodeBlock &&
          (ctx.isEmpty || ctx.selectedNodeType !== undefined),
        getItems: (ctx) => getCodeMenuItems(ctx),
      },
      {
        priority: 90,
        variant: MenuType.inline,
        matches: (ctx) => ctx.isTableSelected,
        getItems: (ctx) => getTableMenuItems(ctx),
      },
      {
        priority: 85,
        variant: MenuType.inline,
        matches: (ctx) => ctx.colIndex !== undefined,
        getItems: (ctx) => getTableColMenuItems(ctx),
      },
      {
        priority: 80,
        variant: MenuType.inline,
        matches: (ctx) => ctx.rowIndex !== undefined,
        getItems: (ctx) => getTableRowMenuItems(ctx),
      },
      {
        priority: 50,
        matches: (ctx) => ctx.selectedNodeType === "image",
        getItems: (ctx) => getImageMenuItems(ctx),
      },
      {
        priority: 50,
        matches: (ctx) => ctx.selectedNodeType === "attachment",
        getItems: (ctx) => getAttachmentMenuItems(ctx),
      },
      {
        priority: 30,
        matches: (ctx) => ctx.readOnly,
        getItems: (ctx) =>
          getReadOnlyMenuItems(ctx, this.editor.props.canUpdate ?? false),
      },
      {
        priority: 20,
        align: "end",
        sticky: true,
        matches: (ctx) => ctx.isInNotice && ctx.isEmpty,
        getItems: (ctx) => getNoticeMenuItems(ctx),
      },
      {
        priority: 0,
        matches: () => true,
        getItems: (ctx) => getFormattingMenuItems(ctx),
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
