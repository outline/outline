import type { Node } from "prosemirror-model";
import { TableView as ProsemirrorTableView } from "prosemirror-tables";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { TableLayout } from "../types";
import { hasVisibleScrollbars, isBrowser } from "../../utils/browser";

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

    // Add a floating horizontal scrollbar that can be pinned to the bottom of
    // the viewport when the table is taller than the screen. It mirrors the
    // scroll position of the real scrollable container above. It is appended to
    // the document body rather than this node view so that a full-width table's
    // transform does not become the containing block for its fixed positioning.
    this.stickyScrollbar = document.createElement("div");
    this.stickyScrollbar.classList.add(EditorStyleHelper.tableStickyScrollbar);
    this.stickyScrollbar.contentEditable = "false";
    this.stickyScrollbar.style.display = "none";
    this.stickyScrollbarInner = this.stickyScrollbar.appendChild(
      document.createElement("div")
    );
    if (isBrowser) {
      document.body.appendChild(this.stickyScrollbar);
    }

    if (isBrowser) {
      this.scrollable.addEventListener(
        "scroll",
        () => {
          this.updateClassList(this.node);
          this.syncStickyScrollbarPosition();
        },
        {
          passive: true,
        }
      );

      this.stickyScrollbar.addEventListener(
        "scroll",
        () => {
          if (this.syncingScroll || !this.scrollable || !this.stickyScrollbar) {
            return;
          }
          this.syncingScroll = true;
          this.scrollable.scrollLeft = this.stickyScrollbar.scrollLeft;
          this.syncingScroll = false;
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
          this.updateStickyScrollbar();
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
    this.updateStickyScrollbar();
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

  private stickyScrollbar: HTMLDivElement | null = null;

  private stickyScrollbarInner: HTMLDivElement | null = null;

  private syncingScroll = false;

  private scrollHandler: ((event: Event) => void) | null = null;

  private resizeHandler: (() => void) | null = null;

  /** Default height of the app's fixed header */
  private static readonly HEADER_HEIGHT = 60;

  /**
   * Sets up the scroll listeners for sticky header and sticky horizontal
   * scrollbar behavior. Nested tables (tables within another table) are
   * excluded from both behaviors.
   */
  private setupStickyHeader() {
    if (!isBrowser) {
      return;
    }

    // Defer setup to ensure DOM is fully rendered
    setTimeout(() => {
      // Skip sticky behavior for nested tables
      if (this.dom.closest(`table .${EditorStyleHelper.table}`)) {
        return;
      }

      this.scrollHandler = (event: Event) => {
        this.updateStickyHeader();

        // When the scroll originates from the floating scrollbar itself, don't
        // sync the thumb position back from the table — the floating
        // scrollbar's own listener is mid-flight propagating the new position
        // to the table, and snapping it back here would fight the user's drag.
        const fromStickyScrollbar = !!(
          event.target instanceof HTMLElement &&
          this.stickyScrollbar?.contains(event.target)
        );
        this.updateStickyScrollbar(!fromStickyScrollbar);
      };

      // Use capture phase on document to catch all scroll events
      document.addEventListener("scroll", this.scrollHandler, {
        passive: true,
        capture: true,
      });

      this.resizeHandler = () => {
        this.updateStickyScrollbar();
      };
      window.addEventListener("resize", this.resizeHandler, { passive: true });

      // Initial update
      this.updateStickyHeader();
      this.updateStickyScrollbar();
    }, 0);
  }

  /**
   * Cleans up the scroll listeners and resets sticky header and scrollbar state.
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

    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    // Reset sticky header state
    this.dom.classList.remove(EditorStyleHelper.tableStickyHeader);
    this.dom.style.removeProperty("--sticky-scroll-offset");

    // Remove the floating scrollbar
    this.stickyScrollbar?.remove();
    this.stickyScrollbar = null;
    this.stickyScrollbarInner = null;
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
   * Shows or hides the floating horizontal scrollbar and keeps its dimensions
   * and scroll position in sync with the real scrollable container. The
   * scrollbar is pinned to the bottom of the viewport whenever the table
   * overflows horizontally and its own scrollbar has been scrolled out of view
   * below the fold, so horizontal scrolling is always reachable.
   *
   * @param syncThumb whether to mirror the table's scroll position onto the
   * floating scrollbar. Disabled while the user is dragging the floating
   * scrollbar to avoid fighting their input.
   */
  private updateStickyScrollbar(syncThumb = true) {
    if (
      !isBrowser ||
      !this.scrollable ||
      !this.stickyScrollbar ||
      !this.stickyScrollbarInner
    ) {
      return;
    }

    const scrollWidth = this.scrollable.scrollWidth;
    const clientWidth = this.scrollable.clientWidth;
    const overflows = scrollWidth > clientWidth + 1;

    const rect = this.scrollable.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    // Only show the floating scrollbar when the browser renders persistent
    // scrollbars (otherwise the table can be scrolled by gesture and a floating
    // bar would look out of place), the table overflows horizontally, is within
    // view, and its real scrollbar sits below the bottom of the viewport.
    const shouldShow =
      hasVisibleScrollbars() &&
      overflows &&
      rect.top < viewportHeight &&
      rect.bottom > viewportHeight;

    if (!shouldShow) {
      if (this.stickyScrollbar.style.display !== "none") {
        this.stickyScrollbar.style.display = "none";
      }
      return;
    }

    this.stickyScrollbar.style.display = "block";
    this.stickyScrollbar.style.left = `${rect.left}px`;
    this.stickyScrollbar.style.width = `${rect.width}px`;
    this.stickyScrollbarInner.style.width = `${scrollWidth}px`;

    if (syncThumb) {
      this.syncStickyScrollbarPosition();
    }
  }

  /**
   * Mirrors the horizontal scroll position of the real scrollable container
   * onto the floating scrollbar.
   */
  private syncStickyScrollbarPosition() {
    if (this.syncingScroll || !this.scrollable || !this.stickyScrollbar) {
      return;
    }
    if (this.stickyScrollbar.scrollLeft !== this.scrollable.scrollLeft) {
      this.syncingScroll = true;
      this.stickyScrollbar.scrollLeft = this.scrollable.scrollLeft;
      this.syncingScroll = false;
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
