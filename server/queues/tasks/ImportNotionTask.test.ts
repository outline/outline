import fs from "fs";
import path from "path";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import ImportNotionTask from "./ImportNotionTask";

beforeEach(() => flushdb());

describe("ImportNotionTask", () => {
  it("should import the documents, attachments", async () => {
    const fileOperation = await buildFileOperation();
    Object.defineProperty(fileOperation, "buffer", {
      get() {
        return fs.readFileSync(
          path.resolve(__dirname, "..", "..", "test", "fixtures", "notion.zip")
        );
      },
    });
    jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);

    const props = {
      fileOperationId: fileOperation.id,
    };

    const task = new ImportNotionTask();
    const response = await task.perform(props);

    expect(response.collections.size).toEqual(2);
    expect(response.documents.size).toEqual(13);
    expect(response.attachments.size).toEqual(1);
  });
});
