import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AppContext } from "@server/types";
import cleanupMultipartFiles from "./cleanupMultipartFiles";

interface MockFile {
  filepath: string;
}

const createContext = (files: Record<string, MockFile | MockFile[]>) =>
  ({
    request: { files },
  }) as unknown as AppContext;

describe("cleanupMultipartFiles middleware", () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "outline-upload-cleanup-")
    );
  });

  afterEach(async () => {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
  });

  it("removes all uploaded files after the request is handled", async () => {
    const firstFilePath = path.join(temporaryDirectory, "first");
    const secondFilePath = path.join(temporaryDirectory, "second");
    await Promise.all([
      fs.writeFile(firstFilePath, "first"),
      fs.writeFile(secondFilePath, "second"),
    ]);

    const middleware = cleanupMultipartFiles();
    const next = vi.fn(async () => {
      await expect(fs.stat(firstFilePath)).resolves.toBeDefined();
      await expect(fs.stat(secondFilePath)).resolves.toBeDefined();
    });

    await middleware(
      createContext({
        first: [{ filepath: firstFilePath }],
        other: [{ filepath: secondFilePath }],
      }),
      next
    );

    expect(next).toHaveBeenCalledOnce();
    await expect(fs.stat(firstFilePath)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(fs.stat(secondFilePath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("removes uploaded files when request handling fails", async () => {
    const filePath = path.join(temporaryDirectory, "failed-request");
    await fs.writeFile(filePath, "content");

    const error = new Error("Request failed");
    const middleware = cleanupMultipartFiles();

    await expect(
      middleware(
        createContext({
          file: { filepath: filePath },
        }),
        vi.fn().mockRejectedValue(error)
      )
    ).rejects.toBe(error);
    await expect(fs.stat(filePath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
