import { pipeline } from "node:stream/promises";
import fs from "fs-extra";
import tmp from "tmp";
import { ZipFile } from "yazl";
import ZipHelper from "./ZipHelper";

async function writeZip(
  entries: Record<string, string>,
  postfix = ".zip"
): Promise<string> {
  const zip = new ZipFile();
  for (const [name, content] of Object.entries(entries)) {
    zip.addBuffer(Buffer.from(content), name);
  }
  const zipPath = tmp.fileSync({ postfix }).name;
  const writing = pipeline(zip.outputStream, fs.createWriteStream(zipPath));
  zip.end();
  await writing;
  return zipPath;
}

describe("ZipHelper.toFileTree", () => {
  it("builds a nested tree with normalized pathInZip", async () => {
    const zipPath = await writeZip({
      "Collection/sub/page.md": "# hi",
      "Collection/other.md": "other",
    });

    const root = await ZipHelper.toFileTree(zipPath);
    expect(root.children).toHaveLength(1);

    const collection = root.children[0];
    expect(collection.name).toBe("Collection");
    expect(collection.pathInZip).toBe("Collection");
    expect(collection.children.map((c) => c.name).sort()).toEqual([
      "other.md",
      "sub",
    ]);

    const sub = collection.children.find((c) => c.name === "sub");
    expect(sub?.children[0].pathInZip).toBe("Collection/sub/page.md");
  });

  it("normalizes `./`-prefixed entries instead of dropping them", async () => {
    const zipPath = await writeZip({
      "./Collection/page.md": "body",
    });

    const root = await ZipHelper.toFileTree(zipPath);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].name).toBe("Collection");
    expect(root.children[0].children[0].pathInZip).toBe("Collection/page.md");
  });

  it("filters macOS metadata and dotfiles at any depth", async () => {
    const zipPath = await writeZip({
      "__MACOSX/Collection/page.md": "junk",
      "Collection/.DS_Store": "junk",
      "Collection/page.md": "body",
    });

    const root = await ZipHelper.toFileTree(zipPath);
    expect(root.children).toHaveLength(1);
    expect(root.children[0].name).toBe("Collection");
    expect(root.children[0].children.map((c) => c.name)).toEqual(["page.md"]);
  });

  it("invokes onFile for each file entry with a readable handle", async () => {
    const zipPath = await writeZip({
      "Collection/page.md": "hello world",
      "Collection/image.png": "binary",
    });

    const seen: Record<string, string> = {};
    await ZipHelper.toFileTree(zipPath, async (node, entry) => {
      if (node.name.endsWith(".md")) {
        const buf = await entry.readBuffer(100);
        seen[node.pathInZip] = buf.toString("utf8");
      }
    });

    expect(seen).toEqual({ "Collection/page.md": "hello world" });
  });

  it("rejects reads larger than the provided max size", async () => {
    const zipPath = await writeZip({
      "Collection/page.md": "hello world",
    });

    await expect(
      ZipHelper.toFileTree(zipPath, async (_node, entry) => {
        await entry.readBuffer(10);
      })
    ).rejects.toThrow("Collection/page.md is too large");
  });

  it("exposes entry sizes before the entry is read", async () => {
    const zipPath = await writeZip({
      "Collection/page.md": "hello world",
    });

    const sizes: Record<string, number> = {};
    await ZipHelper.toFileTree(zipPath, (node, entry) => {
      sizes[node.pathInZip] = entry.uncompressedSize;
    });

    expect(sizes).toEqual({ "Collection/page.md": 11 });
  });
});
