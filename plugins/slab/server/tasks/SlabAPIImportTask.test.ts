import type { ZipTreeNode } from "@server/utils/ZipHelper";
import SlabAPIImportTask from "./SlabAPIImportTask";

class TestSlabAPIImportTask extends SlabAPIImportTask {
  public resolve(nodes: ZipTreeNode[]): ZipTreeNode[] {
    return this.resolveCollectionRootNodes(nodes);
  }

  public extractsTitleFromHeading(): boolean {
    return this.shouldExtractTitleFromHeading();
  }
}

const dir = (
  title: string,
  children: ZipTreeNode[] = [],
  pathInZip = title
): ZipTreeNode => ({
  name: title,
  title,
  pathInZip,
  children,
});

const file = (name: string, pathInZip = name): ZipTreeNode => ({
  name,
  title: name.replace(/\.[^.]+$/, ""),
  pathInZip,
  children: [],
});

describe("SlabAPIImportTask#resolveCollectionRootNodes", () => {
  const task = new TestSlabAPIImportTask();

  it("unwraps a single root 'slab' directory into its children", () => {
    const eng = dir(
      "Engineering",
      [file("doc.md", "slab/Engineering/doc.md")],
      "slab/Engineering"
    );
    const product = dir(
      "Product",
      [file("spec.md", "slab/Product/spec.md")],
      "slab/Product"
    );
    const root = dir("slab", [eng, product], "slab");

    expect(task.resolve([root])).toEqual([eng, product]);
  });

  it("is case-insensitive on the wrapper directory name", () => {
    const child = dir("Team", [file("a.md", "Slab/Team/a.md")], "Slab/Team");
    const root = dir("Slab", [child], "Slab");

    expect(task.resolve([root])).toEqual([child]);
  });

  it("leaves multiple root directories untouched", () => {
    const a = dir("Engineering", [file("a.md", "Engineering/a.md")]);
    const b = dir("slab", [file("b.md", "slab/b.md")]);

    expect(task.resolve([a, b])).toEqual([a, b]);
  });

  it("leaves a single non-'slab' root directory untouched", () => {
    const a = dir("Engineering", [file("doc.md", "Engineering/doc.md")]);

    expect(task.resolve([a])).toEqual([a]);
  });

  it("does not unwrap an empty 'slab' directory", () => {
    const root = dir("slab", []);

    expect(task.resolve([root])).toEqual([root]);
  });

  it("does not derive the title from a document's leading heading", () => {
    expect(task.extractsTitleFromHeading()).toBe(false);
  });
});
