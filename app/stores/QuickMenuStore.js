// @flow
import { observable, computed, action } from "mobx";
import { type MenuItem } from "types";

type QuickMenuContext = {|
  id: string,
  title: string,
  items: MenuItem[],
  priority?: number,
|};

class QuickMenuStore {
  @observable searchTerm: string = "";
  @observable contextItems: Map<string, QuickMenuContext> = new Map();

  @computed
  get orderedData(): QuickMenuContext[] {
    if (!this.searchTerm) {
      return Array.from(this.contextItems.values());
    }

    let filtered = [];

    this.contextItems.forEach((context) => {
      const items = context.items.filter(
        (item) =>
          typeof item.title === "string" &&
          item.title.toLowerCase().includes(this.searchTerm.toLowerCase())
      );

      if (items.length) {
        filtered.push({
          ...context,
          items,
        });
      }
    });

    return filtered;
  }

  @action
  setSearchTerm(searchTerm: string): void {
    this.searchTerm = searchTerm;
  }

  @action
  addContext(context: QuickMenuContext): void {
    this.contextItems.set(context.id, context);
  }

  @action
  removeContext(id: string): void {
    this.contextItems.delete(id);
  }
}

export default QuickMenuStore;
