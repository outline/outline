import type { Node } from "prosemirror-model";
import { TableView as ProsemirrorTableView } from "prosemirror-tables";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { TableLayout } from "../types";
import { isBrowser } from "../../utils/browser";

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

    if (isBrowser) {
      this.scrollable.addEventListener(
        "scroll",
        () => {
          this.updateClassList(this.node);
        },
        {
          passive: true,
        }
      );
    }

    this.updateClassList(node);

    // We need to wait for the next tick to ensure dom is rendered and scroll shadows are correct.
    if (isBrowser) {
      setTimeout(() => {
        if (this.dom) {
          this.updateClassList(node);
        }
      }, 0);
    }

    // Set up sticky header handling
    this.setupStickyHeader();
  }

  public destroy() {
    this.cleanupStickyHeader();
  }

  public override update(node: Node) {
    this.updateClassList(node);
    return super.update(node);
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

  private updateClassList(node: Node) {
    if (!isBrowser) {
      return;
    }

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

  private scrollable: HTMLDivElement | null = null;

  private scrollHandler: (() => void) | null = null;

  /** Default height of the app's fixed header */
  private static readonly HEADER_HEIGHT = 60;

  /**
   * Sets up the scroll listener for sticky header behavior.
   */
  private setupStickyHeader() {
    if (!isBrowser) {
      return;
    }

    // Defer setup to ensure DOM is fully rendered
    setTimeout(() => {
      this.scrollHandler = () => {
        this.updateStickyHeader();
      };

      // Use capture phase on document to catch all scroll events
      document.addEventListener("scroll", this.scrollHandler, {
        passive: true,
        capture: true,
      });

      // Initial update
      this.updateStickyHeader();
    }, 0);
  }

  /**
   * Cleans up the scroll listener and resets header styles.
   */
  private cleanupStickyHeader() {
    if (!isBrowser) {
      return;
    }

    if (this.scrollHandler) {
      document.removeEventListener("scroll", this.scrollHandler, {
        capture: true,
      });
      this.scrollHandler = null;
    }

    // Reset sticky header state
    this.dom.classList.remove(EditorStyleHelper.tableStickyHeader);
    this.dom.style.removeProperty("--sticky-scroll-offset");
  }

  /**
   * Updates the header row transform to create a sticky effect.
   */
  private updateStickyHeader() {
    if (!isBrowser) {
      return;
    }

    const headerRow = this.table.querySelector("tr") as HTMLElement | null;
    if (!headerRow) {
      return;
    }

    const tableRect = this.table.getBoundingClientRect();
    const headerRowHeight = headerRow.getBoundingClientRect().height;
    const headerOffset = this.getHeaderOffset();

    // Check if the table top is above the header area but the table extends below it
    const shouldStick =
      tableRect.top < headerOffset &&
      tableRect.bottom > headerOffset + headerRowHeight;

    if (shouldStick) {
      // Set the raw scroll offset - CSS will add the header offset
      const scrollOffset = Math.min(
        -tableRect.top,
        tableRect.height - headerRowHeight
      );
      this.dom.classList.add(EditorStyleHelper.tableStickyHeader);
      this.dom.style.setProperty("--sticky-scroll-offset", `${scrollOffset}px`);
    } else {
      this.dom.classList.remove(EditorStyleHelper.tableStickyHeader);
      this.dom.style.removeProperty("--sticky-scroll-offset");
    }
  }

  /**
   * Gets the current header offset from the CSS variable.
   *
   * @returns the offset in pixels from the top of the viewport.
   */
  private getHeaderOffset(): number {
    if (!isBrowser) {
      return TableView.HEADER_HEIGHT;
    }

    const value = getComputedStyle(document.documentElement).getPropertyValue(
      "--header-offset"
    );
    return value ? parseFloat(value) : TableView.HEADER_HEIGHT;
  }
}
