import { action, computed, observable } from "mobx";

/**
 * Holds the ephemeral multi-selection state for a single list of models.
 * Backed by an observable set so that list items only re-render when their own
 * selected state changes. Selection is keyed by model identifier and is
 * model-agnostic — resolving identifiers back to models is the caller's
 * concern.
 */
export class ModelSelection {
  private ids = observable.set<string>();

  /** Ordered identifiers of the list, used to resolve shift-click ranges. */
  private order: string[] = [];

  /** The identifier last toggled, used as the anchor for range selection. */
  private anchorId: string | undefined;

  /** The number of currently selected models. */
  @computed
  get size(): number {
    return this.ids.size;
  }

  /** Whether one or more models are currently selected. */
  @computed
  get isActive(): boolean {
    return this.ids.size > 0;
  }

  /** The identifiers of the currently selected models. */
  @computed
  get selectedIds(): string[] {
    return Array.from(this.ids);
  }

  /**
   * Update the ordered identifiers of the list so that shift-click range
   * selection follows the rendered order.
   *
   * @param order The identifiers in the order they are displayed.
   */
  setOrder = (order: string[]): void => {
    this.order = order;
  };

  /**
   * Whether the model with the given identifier is selected.
   *
   * @param id The model identifier.
   * @returns true if the model is selected.
   */
  isSelected = (id: string): boolean => this.ids.has(id);

  /**
   * Toggle the selected state of a model, making it the anchor for any
   * subsequent range selection.
   *
   * @param id The model identifier.
   */
  @action
  toggle = (id: string): void => {
    if (this.ids.has(id)) {
      this.ids.delete(id);
    } else {
      this.ids.add(id);
    }
    this.anchorId = id;
  };

  /**
   * Select every model between the current anchor and the given identifier
   * inclusive, in the list's display order. Falls back to a plain toggle when
   * there is no anchor or either identifier is not present in the order.
   *
   * @param id The model identifier at the far end of the range.
   */
  @action
  selectRange = (id: string): void => {
    if (this.anchorId === undefined) {
      this.toggle(id);
      return;
    }

    const from = this.order.indexOf(this.anchorId);
    const to = this.order.indexOf(id);
    if (from === -1 || to === -1) {
      this.toggle(id);
      return;
    }

    const [lo, hi] = from <= to ? [from, to] : [to, from];
    for (let i = lo; i <= hi; i++) {
      this.ids.add(this.order[i]);
    }
    // Keep the anchor so consecutive shift-clicks extend from the same origin.
  };

  /** Deselect all models. */
  @action
  clear = (): void => {
    this.ids.clear();
    this.anchorId = undefined;
  };
}
