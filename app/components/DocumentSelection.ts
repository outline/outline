import { action, computed, observable } from "mobx";

/**
 * Holds the ephemeral multi-selection state for a single list of documents.
 * Backed by an observable set so that list items only re-render when their own
 * selected state changes.
 */
export class DocumentSelection {
  private ids = observable.set<string>();

  /** The number of currently selected documents. */
  @computed
  get size(): number {
    return this.ids.size;
  }

  /** Whether one or more documents are currently selected. */
  @computed
  get isActive(): boolean {
    return this.ids.size > 0;
  }

  /** The identifiers of the currently selected documents. */
  @computed
  get selectedIds(): string[] {
    return Array.from(this.ids);
  }

  /**
   * Whether the document with the given identifier is selected.
   *
   * @param id The document identifier.
   * @returns true if the document is selected.
   */
  isSelected = (id: string): boolean => this.ids.has(id);

  /**
   * Toggle the selected state of a document.
   *
   * @param id The document identifier.
   */
  @action
  toggle = (id: string): void => {
    if (this.ids.has(id)) {
      this.ids.delete(id);
    } else {
      this.ids.add(id);
    }
  };

  /** Deselect all documents. */
  @action
  clear = (): void => {
    this.ids.clear();
  };
}
