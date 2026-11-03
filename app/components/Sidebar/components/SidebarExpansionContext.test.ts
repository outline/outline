import { autorun } from "mobx";
import { SidebarExpansionState } from "./SidebarExpansionContext";

describe("SidebarExpansionState", () => {
  it("should only notify observers of the node that changed", () => {
    const state = new SidebarExpansionState();
    let runs = 0;
    const dispose = autorun(() => {
      state.isExpanded("a");
      runs++;
    });

    state.expand("b");
    state.expandPath(["c", "d"]);
    expect(runs).toBe(1);

    state.expand("a");
    expect(runs).toBe(2);

    state.collapse("a");
    expect(state.isExpanded("a")).toBe(false);
    expect(runs).toBe(3);

    dispose();
  });

  it("should expand and collapse descendants", () => {
    const state = new SidebarExpansionState();
    const node = {
      id: "a",
      title: "A",
      url: "/doc/a",
      children: [{ id: "b", title: "B", url: "/doc/b", children: [] }],
    };

    state.expandDescendants(node);
    expect(state.isExpanded("a")).toBe(true);
    expect(state.isExpanded("b")).toBe(true);

    state.collapseDescendants(node);
    expect(state.isExpanded("a")).toBe(false);
    expect(state.isExpanded("b")).toBe(false);
  });
});
