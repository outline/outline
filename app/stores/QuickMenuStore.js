// @flow
import { observable, computed, action } from "mobx";

type CommandItem = {|
  title: React.Node,
  icon?: React.Node,
  onClick: (event: SyntheticEvent<>) => void | Promise<void>,
  items?: CommandItem[],
|};

type QuickMenuContext = {|
  id: string,
  title: string,
  items: CommandItem[],
  priority?: number,
|};

class QuickMenuStore {
  @observable searchTerm: string = "";
  @observable contextItems: Map<string, QuickMenuContext> = new Map();
  @observable states: Map<string, any> = new Map();
  @observable path: string[] = ["Home"];

  @computed
  get resolvedMenuItems(): QuickMenuContext[] {
    const currentPath = this.path[this.path.length - 1];

    if (currentPath === "Home") {
      let filtered = [];
      this.contextItems.forEach((context) => {
        const items = context.items.filter(
          (item) =>
            !this.searchTerm ||
            (typeof item.title === "string" &&
              item.title.toLowerCase().includes(this.searchTerm.toLowerCase()))
        );

        if (items.length) {
          filtered.push({
            ...context,
            items,
          });
        }
      });

      return filtered;
    } else {
      let items = this.states.get(currentPath);
      if (!items) return [];

      const filtered = items.filter(
        (item) =>
          !this.searchTerm ||
          (typeof item.title === "string" &&
            item.title.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );

      return [{ id: currentPath, title: currentPath, items: filtered }];
    }
  }

  @action
  handleNestedItems(item: CommandItem) {
    this.states.set(item.title, item.items);
    this.path = [...this.path, item.title];
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

  @action
  reset() {
    this.setSearchTerm("");
    this.states.clear();
    this.path = ["Home"];
  }

  @action
  handlePathClick(toPath: string) {
    if (toPath === "Home") {
      this.states.clear();
      this.path = ["Home"];
    } else {
      const pathsToRemove = this.path.slice(this.path.indexOf(toPath) + 1);
      pathsToRemove.forEach((path) => this.states.delete(path));
      this.path = this.path.slice(0, this.path.indexOf(toPath) + 1);
    }
  }
}

export default QuickMenuStore;
