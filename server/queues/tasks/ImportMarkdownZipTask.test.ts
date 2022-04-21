import fs from "fs";
import path from "path";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import ImportMarkdownZipTask from "./ImportMarkdownZipTask";

beforeEach(() => flushdb());

describe("ImportMarkdownZipTask", () => {
  it("should parse the zip", async () => {
    const fileOperation = await buildFileOperation();

    Object.defineProperty(fileOperation, "buffer", {
      get() {
        return fs.readFileSync(
          path.resolve(__dirname, "..", "..", "test", "fixtures", "outline.zip")
        );
      },
    });

    jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);

    const props = {
      fileOperationId: fileOperation.id,
    };

    const task = new ImportMarkdownZipTask(props);
    await task.perform(props);
  });
});
