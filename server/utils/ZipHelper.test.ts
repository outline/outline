import path from "node:path";
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
  await new Promise<void>((resolve, reject) => {
    const dest = fs
      .createWriteStream(zipPath)
      .on("finish", () => resolve())
      .on("error", reject);
    zip.outputStream.on("error", reject).pipe(dest);
    zip.end();
  });
  return zipPath;
}

describe("ZipHelper.extract", () => {
  it("extracts a simple nested file inside the output directory", async () => {
    const outputDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const zipPath = await writeZip({ "a/b/hello.txt": "hi" });

    await ZipHelper.extract(zipPath, outputDir);

    const content = await fs.readFile(
      path.join(outputDir, "a", "b", "hello.txt"),
      "utf8"
    );
    expect(content).toBe("hi");
  });

  it("does not escape the output directory when the joined path exceeds MAX_PATH_LENGTH", async () => {
    // Build a nested path whose joined length exceeds the old MAX_PATH_LENGTH
    // (4096) threshold. Previously, passing the full path to trimFileAndExt
    // would drop every directory segment and write the file relative to the
    // process CWD.
    const filename = "poc_escape_target.txt";
    const outputDir = tmp.dirSync({ unsafeCleanup: true }).name;

    // Pick a segment count that pushes the total joined path past 4096 bytes
    // while keeping the directory portion under Linux PATH_MAX (4096).
    const overhead = outputDir.length + 1 + 1 + filename.length;
    const segments = Math.ceil((4097 - overhead) / 2);
    const entryName = "a/".repeat(segments) + filename;

    const zipPath = await writeZip({ [entryName]: "ZIP_ESCAPE_POC_CONTENT" });

    // Run extraction from a clean working directory so we can detect an escape
    // without polluting the repo root.
    const cwd = process.cwd();
    const scratchCwd = tmp.dirSync({ unsafeCleanup: true }).name;
    process.chdir(scratchCwd);
    try {
      await ZipHelper.extract(zipPath, outputDir).catch(() => {
        // Some environments may reject long paths; the key assertion below
        // still verifies no file escaped the output directory.
      });
    } finally {
      process.chdir(cwd);
    }

    // The escaped filename must NOT appear in CWD.
    expect(await fs.pathExists(path.join(scratchCwd, filename))).toBe(false);
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
