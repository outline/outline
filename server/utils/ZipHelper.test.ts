import path from "node:path";
import fs from "fs-extra";
import JSZip from "jszip";
import tmp from "tmp";
import ZipHelper from "./ZipHelper";

async function writeZip(
  entries: Record<string, string>,
  postfix = ".zip"
): Promise<string> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(entries)) {
    zip.file(name, content);
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipPath = tmp.fileSync({ postfix }).name;
  await fs.writeFile(zipPath, buffer);
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
