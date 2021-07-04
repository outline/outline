// @flow
import { observable, computed, action } from "mobx";
import * as React from "react";
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
  get resolvedMenuItems(): QuickMenuContext[] {
    let filtered = [];

    this.contextItems.forEach((context) => {
      const items = context.items.filter(
        (item) =>
          !this.searchTerm ||
          (typeof item.title === "string" &&
            item.title.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );

      items.forEach((item, index) => {
        if (item.items && item.title) {
          items.splice(
            index,
            1,
            item.items.map((child: MenuItem) => {
              if (!child.title) {
                return child;
              }

              return {
                ...child,
                title: (
                  <>
                    {item.title} > {child.title}
                  </>
                ),
              };
            })
          );
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
}

export default QuickMenuStore;
