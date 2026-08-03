import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import fs from "fs-extra";
import tmp from "tmp";
import { vi } from "vitest";
import { ZipFile } from "yazl";
import { buildZip } from "@server/test/support";
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

/**
 * Watch for the temporary file toTmpFile writes to, so that cleanup can be
 * asserted against that exact path rather than by scanning the shared temp
 * directory, which tests running in parallel also write to.
 */
function watchTmpFile() {
  const createWriteStream = vi.spyOn(fs, "createWriteStream");
  return () => {
    expect(createWriteStream).toHaveBeenCalledTimes(1);
    return String(createWriteStream.mock.calls[0][0]);
  };
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    const tmpFile = watchTmpFile();

    await expect(
      ZipHelper.toTmpFile(async (zip) => {
        zip.addBuffer(Buffer.from("partial"), "a.txt");
        await Promise.resolve();
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(await fs.pathExists(tmpFile())).toBe(false);
  });

  it("propagates errors raised when opening an entry and cleans up", async () => {
    const tmpFile = watchTmpFile();

    await expect(
      ZipHelper.toTmpFile(async (zip) => {
        zip.addReadStreamLazy("a.txt", {}, (callback) =>
          callback(new Error("stream unavailable"), Readable.from([]))
        );
        await Promise.resolve();
      })
    ).rejects.toThrow("stream unavailable");

    expect(await fs.pathExists(tmpFile())).toBe(false);
  });

  it("fails rather than stalls when an entry's stream errors mid-read", async () => {
    const tmpFile = watchTmpFile();

    await expect(
      ZipHelper.toTmpFile(async (zip) => {
        const source = new Readable({
          read() {
            this.push("partial");
            this.destroy(new Error("connection reset"));
          },
        });
        // Mirrors how ExportTask surfaces an interrupted read, which yazl
        // does not watch for on the streams it is given.
        source.on("error", (err) => zip.emit("error", err));
        zip.addReadStreamLazy("a.txt", {}, (callback) =>
          callback(null, source)
        );
        await Promise.resolve();
      })
    ).rejects.toThrow("connection reset");

    expect(await fs.pathExists(tmpFile())).toBe(false);
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

describe("ZipHelper.walk", () => {
  it("walks an archive held in memory", async () => {
    const buffer = await buildZip({
      "Collection/page.md": "hello world",
      "Collection/image.png": "binary",
    });

    const contents: Record<string, string> = {};
    await ZipHelper.walk(buffer, async (entry) => {
      if (!entry.isDirectory) {
        contents[entry.fileName] = (await entry.readBuffer(1024)).toString(
          "utf8"
        );
      }
    });

    expect(contents).toEqual({
      "Collection/page.md": "hello world",
      "Collection/image.png": "binary",
    });
  });

  it("rejects an oversized entry in an archive held in memory", async () => {
    const buffer = await buildZip({ "Collection/page.md": "hello world" });

    await expect(
      ZipHelper.walk(buffer, async (entry) => {
        await entry.readBuffer(4);
      })
    ).rejects.toThrow("Collection/page.md is too large");
  });
});
