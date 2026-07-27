import os from "node:os";
import { Readable } from "node:stream";
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

/** Names of the temporary files toTmpFile may have left behind. */
async function listTmpZips(): Promise<Set<string>> {
  const files = await fs.readdir(os.tmpdir());
  return new Set(files.filter((file) => file.startsWith("export-")));
}

async function readZip(filePath: string): Promise<Record<string, string>> {
  const contents: Record<string, string> = {};
  await ZipHelper.walk(filePath, async (entry) => {
    if (!entry.isDirectory) {
      contents[entry.fileName] = (await entry.readBuffer(1024)).toString(
        "utf8"
      );
    }
  });
  return contents;
}

describe("ZipHelper.toTmpFile", () => {
  it("writes buffered and streamed entries to a temporary file", async () => {
    const filePath = await ZipHelper.toTmpFile(async (zip) => {
      zip.addBuffer(Buffer.from("hello"), "a.txt");
      zip.addReadStreamLazy("b.txt", {}, (callback) =>
        callback(null, Readable.from(["wo", "rld"]))
      );
      await Promise.resolve();
    });

    expect(await readZip(filePath)).toEqual({
      "a.txt": "hello",
      "b.txt": "world",
    });
    await fs.remove(filePath);
  });

  it("opens each lazy stream only when its entry is written", async () => {
    const opened: string[] = [];
    const filePath = await ZipHelper.toTmpFile(async (zip) => {
      for (const name of ["a.txt", "b.txt", "c.txt"]) {
        zip.addReadStreamLazy(name, {}, (callback) => {
          opened.push(name);
          callback(null, Readable.from([name]));
        });
      }
      await Promise.resolve();
      // Nothing is read up front — sources are opened one at a time as the
      // archive is pumped, so only one file is ever held open.
      expect(opened.length).toBeLessThan(3);
    });

    expect(opened).toEqual(["a.txt", "b.txt", "c.txt"]);
    await fs.remove(filePath);
  });

  it("propagates errors thrown while adding entries and cleans up", async () => {
    const before = await listTmpZips();

    await expect(
      ZipHelper.toTmpFile(async (zip) => {
        zip.addBuffer(Buffer.from("partial"), "a.txt");
        await Promise.resolve();
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const after = await listTmpZips();
    expect([...after].filter((file) => !before.has(file))).toEqual([]);
  });

  it("propagates errors raised by an entry's stream and cleans up", async () => {
    const before = await listTmpZips();

    await expect(
      ZipHelper.toTmpFile(async (zip) => {
        zip.addReadStreamLazy("a.txt", {}, (callback) =>
          callback(new Error("stream unavailable"), Readable.from([]))
        );
        await Promise.resolve();
      })
    ).rejects.toThrow("stream unavailable");

    const after = await listTmpZips();
    expect([...after].filter((file) => !before.has(file))).toEqual([]);
  });
});

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
