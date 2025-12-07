import { Node } from "prosemirror-model";
import { TableView as ProsemirrorTableView } from "prosemirror-tables";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { TableLayout } from "../types";

export class TableView extends ProsemirrorTableView {
  public constructor(
    public node: Node,
    public cellMinWidth: number
  ) {
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

    // We need to wait for the next tick to ensure dom is rendered and scroll shadows are correct.
    setTimeout(() => {
      if (this.dom) {
        this.updateClassList(node);
      }
    }, 0);

    this.setupPrintScaling();
  }

  public override update(node: Node) {
    this.updateClassList(node);
    const didUpdate = super.update(node);
    this.updatePrintScale();
    return didUpdate;
  }

  public override ignoreMutation(record: MutationRecord): boolean {
    if (
      record.type === "attributes" &&
      record.target === this.dom &&
      (record.attributeName === "class" || record.attributeName === "style")
    ) {
      return true;
    }

    return (
      record.type === "attributes" &&
      (record.target === this.table || this.colgroup.contains(record.target))
    );
  }

  public override destroy() {
    this.teardownPrintScaling();
    super.destroy();
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

    if (this.scrollable) {
      this.dom.style.setProperty(
        "--table-height",
        `${this.scrollable?.clientHeight}px`
      );
      this.dom.style.setProperty(
        "--table-width",
        `${this.scrollable?.clientWidth}px`
      );
    } else {
      this.dom.style.removeProperty("--table-height");
      this.dom.style.removeProperty("--table-width");
    }
  }

  private readonly handleBeforePrint = () => {
    this.updatePrintScale();
  };

  private readonly handlePrintMediaChange = (event: MediaQueryListEvent) => {
    if (event.matches) {
      this.updatePrintScale();
    }
  };

  private readonly handleResize = () => {
    this.updatePrintScale();
  };

  private setupPrintScaling() {
    if (typeof window === "undefined") {
      return;
    }

    this.updatePrintScale();

    this.printMediaQuery = window.matchMedia("print");

    if (this.printMediaQuery?.addEventListener) {
      this.printMediaQuery.addEventListener("change", this.handlePrintMediaChange);
    } else if (this.printMediaQuery?.addListener) {
      this.printMediaQuery.addListener(this.handlePrintMediaChange);
    }

    window.addEventListener("beforeprint", this.handleBeforePrint);
    window.addEventListener("resize", this.handleResize, { passive: true });

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.updatePrintScale());
      this.resizeObserver.observe(this.table);
      if (this.scrollable) {
        this.resizeObserver.observe(this.scrollable);
      }
    }

    setTimeout(() => {
      this.updatePrintScale();
    }, 0);
  }

  private teardownPrintScaling() {
    window.removeEventListener("beforeprint", this.handleBeforePrint);
    window.removeEventListener("resize", this.handleResize);

    if (this.printMediaQuery?.removeEventListener) {
      this.printMediaQuery.removeEventListener("change", this.handlePrintMediaChange);
    } else if (this.printMediaQuery?.removeListener) {
      this.printMediaQuery.removeListener(this.handlePrintMediaChange);
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.printMediaQuery = undefined;
  }

  private updatePrintScale() {
    if (!this.scrollable) {
      return;
    }

    const availableWidth = this.scrollable.getBoundingClientRect().width;
    const naturalWidth = this.table.scrollWidth;

    if (!availableWidth || !naturalWidth) {
      this.dom.style.setProperty("--print-table-scale", "1");
      return;
    }

    const scale = Math.min(1, Math.max(0.01, availableWidth / naturalWidth));

    this.dom.style.setProperty("--print-table-scale", scale.toString());
  }

  private scrollable: HTMLDivElement | null = null;

  private resizeObserver?: ResizeObserver;

  private printMediaQuery?: MediaQueryList;
}
