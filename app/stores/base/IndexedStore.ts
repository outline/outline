import { override } from "mobx";
import type Model from "~/models/base/Model";
import Store from "./Store";

/**
 * A store for models that carry a fractional index, ordered by that index and
 * then by the most recently updated.
 */
export default abstract class IndexedStore<
  T extends Model & { index: string },
> extends Store<T> {
  @override
  get orderedData(): T[] {
    return Array.from(this.data.values()).sort((a, b) => {
      if (a.index === b.index) {
        return a.updatedAt > b.updatedAt ? -1 : 1;
      }

      return a.index < b.index ? -1 : 1;
    });
  }
}
