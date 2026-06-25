import { ModelSelection } from "./ModelSelection";

describe("ModelSelection", () => {
  it("starts empty and inactive", () => {
    const selection = new ModelSelection();
    expect(selection.size).toBe(0);
    expect(selection.isActive).toBe(false);
    expect(selection.selectedIds).toEqual([]);
    expect(selection.isSelected("a")).toBe(false);
  });

  it("toggles a model on and off", () => {
    const selection = new ModelSelection();

    selection.toggle("a");
    expect(selection.isSelected("a")).toBe(true);
    expect(selection.size).toBe(1);
    expect(selection.isActive).toBe(true);

    selection.toggle("a");
    expect(selection.isSelected("a")).toBe(false);
    expect(selection.size).toBe(0);
    expect(selection.isActive).toBe(false);
  });

  it("tracks multiple selected models", () => {
    const selection = new ModelSelection();

    selection.toggle("a");
    selection.toggle("b");
    expect(selection.size).toBe(2);
    expect(selection.selectedIds).toEqual(["a", "b"]);
  });

  it("clears all selected models", () => {
    const selection = new ModelSelection();

    selection.toggle("a");
    selection.toggle("b");
    selection.clear();

    expect(selection.size).toBe(0);
    expect(selection.isActive).toBe(false);
    expect(selection.selectedIds).toEqual([]);
  });

  describe("selectRange", () => {
    it("falls back to toggle when there is no anchor", () => {
      const selection = new ModelSelection();
      selection.setOrder(["a", "b", "c"]);

      selection.selectRange("b");
      expect(selection.selectedIds).toEqual(["b"]);
    });

    it("selects the inclusive range from the anchor downwards", () => {
      const selection = new ModelSelection();
      selection.setOrder(["a", "b", "c", "d"]);

      selection.toggle("a");
      selection.selectRange("c");
      expect(selection.selectedIds).toEqual(["a", "b", "c"]);
    });

    it("selects the inclusive range from the anchor upwards", () => {
      const selection = new ModelSelection();
      selection.setOrder(["a", "b", "c", "d"]);

      selection.toggle("c");
      selection.selectRange("a");
      expect(selection.selectedIds.sort()).toEqual(["a", "b", "c"]);
    });

    it("keeps the original anchor for consecutive ranges", () => {
      const selection = new ModelSelection();
      selection.setOrder(["a", "b", "c", "d"]);

      selection.toggle("b");
      selection.selectRange("d");
      selection.selectRange("a");
      expect(selection.selectedIds.sort()).toEqual(["a", "b", "c", "d"]);
    });
  });
});
