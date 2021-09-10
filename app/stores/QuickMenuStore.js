// @flow
import { observable, computed, action } from "mobx";
import { type MenuItem } from "types";

type CommandItem = {|
  title: React.Node,
  icon?: React.Node,
  onClick: (event: SyntheticEvent<>) => void | Promise<void>,
|};

type QuickMenuContext = {|
  id: string,
  title: string,
  items: MenuItem[],
  priority?: number,
|};

class QuickMenuStore {
  @observable searchTerm: string = "";
  @observable contextItems: Map<string, QuickMenuContext> = new Map();
  @observable showNested: boolean = false;
  @observable nestedMenu: {|
    title: React.Node,
    visible?: boolean,
    disabled?: boolean,
    style?: Object,
    hover?: boolean,
    items: MenuItem[],
    icon?: React.Node,
  |} | void;

  @computed
  get resolvedMenuItems(): QuickMenuContext[] {
    let filtered = [];
    if (this.showNested && this.nestedMenu) {
      return [
        {
          id: this.nestedMenu.title,
          title: this.nestedMenu.title,
          items: this.nestedMenu.items,
        },
      ];
    }
    this.contextItems.forEach((context) => {
      const items = context.items.filter(
        (item) =>
          item.type !== "separator" &&
          (item.visible || context.id === "account") &&
          (!this.searchTerm ||
            (typeof item.title === "string" &&
              item.title.toLowerCase().includes(this.searchTerm.toLowerCase())))
      );

      items.forEach((item, index) => {
        // has nested menu
        if (item.items && item.title) {
          const newOnClick = () => {
            this.activateNestedState(item);
          };
          item.onClick = newOnClick;
        }
      });

      if (items.length) {
        filtered.push({
          ...context,
          items,
        });
      }
    });

    console.log({ filtered });
    return filtered;
  }

  @action
  activateNestedState(item: {|
    title: React.Node,
    visible?: boolean,
    disabled?: boolean,
    style?: Object,
    hover?: boolean,
    items: MenuItem[],
    icon?: React.Node,
  |}) {
    this.showNested = true;
    this.nestedMenu = item;
  }

  @action
  nestedItems(title: string, item: QuickMenuContext): void {
    this.contextItems.clear();
    this.contextItems.set(title, item);
  }

  @action
  setSearchTerm(searchTerm: string): void {
    console.log({ searchTerm });
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
    this.showNested = false;
    this.nestedMenu = undefined;
  }
}

export default QuickMenuStore;
