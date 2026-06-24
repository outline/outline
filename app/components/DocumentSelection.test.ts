import { DocumentSelection } from "./DocumentSelection";

describe("DocumentSelection", () => {
  it("starts empty and inactive", () => {
    const selection = new DocumentSelection();
    expect(selection.size).toBe(0);
    expect(selection.isActive).toBe(false);
    expect(selection.selectedIds).toEqual([]);
    expect(selection.isSelected("a")).toBe(false);
  });

  it("toggles a document on and off", () => {
    const selection = new DocumentSelection();

    selection.toggle("a");
    expect(selection.isSelected("a")).toBe(true);
    expect(selection.size).toBe(1);
    expect(selection.isActive).toBe(true);

    selection.toggle("a");
    expect(selection.isSelected("a")).toBe(false);
    expect(selection.size).toBe(0);
    expect(selection.isActive).toBe(false);
  });

  it("tracks multiple selected documents", () => {
    const selection = new DocumentSelection();

    selection.toggle("a");
    selection.toggle("b");
    expect(selection.size).toBe(2);
    expect(selection.selectedIds).toEqual(["a", "b"]);
  });

  it("clears all selected documents", () => {
    const selection = new DocumentSelection();

    selection.toggle("a");
    selection.toggle("b");
    selection.clear();

    expect(selection.size).toBe(0);
    expect(selection.isActive).toBe(false);
    expect(selection.selectedIds).toEqual([]);
  });
});
