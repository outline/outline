import { Node } from "prosemirror-model";
import { TableView as ProsemirrorTableView } from "prosemirror-tables";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { TableLayout } from "../types";

export class TableView extends ProsemirrorTableView {
  public constructor(public node: Node, public cellMinWidth: number) {
    super(node, cellMinWidth);

    this.dom.removeChild(this.table);
    this.dom.classList.add(EditorStyleHelper.table);

    // Add an extra wrapper to enable scrolling
    this.scrollable = this.dom.appendChild(document.createElement("div"));
    this.scrollable.appendChild(this.table);
    this.scrollable.classList.add(EditorStyleHelper.tableScrollable);

    this.scrollable.addEventListener(
      "scroll",
      () => {
        this.updateClassList(this.node);
      },
      {
        passive: true,
      }
    );

    this.updateClassList(node);
  }

  public override update(node: Node) {
    this.updateClassList(node);
    return super.update(node);
  }

  public override ignoreMutation(record: MutationRecord): boolean {
    if (
      record.type === "attributes" &&
      record.target === this.dom &&
      record.attributeName === "class"
    ) {
      return true;
    }

    return (
      record.type === "attributes" &&
      (record.target === this.table || this.colgroup.contains(record.target))
    );
  }

  private updateClassList(node: Node) {
    this.dom.classList.toggle(
      EditorStyleHelper.tableFullWidth,
      node.attrs.layout === TableLayout.fullWidth
    );

    const shadowLeft = !!(this.scrollable && this.scrollable.scrollLeft > 0);
    const shadowRight = !!(
      this.scrollable &&
      this.scrollable.scrollWidth > this.scrollable.clientWidth &&
      this.scrollable.scrollLeft + this.scrollable.clientWidth <
        this.scrollable.scrollWidth - 1
    );

    this.dom.classList.toggle(EditorStyleHelper.tableShadowLeft, shadowLeft);
    this.dom.classList.toggle(EditorStyleHelper.tableShadowRight, shadowRight);
  }

  private scrollable: HTMLDivElement | null = null;
}
