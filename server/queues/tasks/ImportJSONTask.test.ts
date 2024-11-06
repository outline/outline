import path from "path";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import ImportJSONTask from "./ImportJSONTask";

describe("ImportJSONTask", () => {
  it("should import the documents, attachments", async () => {
    const fileOperation = await buildFileOperation();
    Object.defineProperty(fileOperation, "handle", {
      get() {
        return {
          path: path.resolve(
            __dirname,
            "..",
            "..",
            "test",
            "fixtures",
            "outline-json.zip"
          ),
          cleanup: async () => {},
        };
      },
    });
    jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);

    const props = {
      fileOperationId: fileOperation.id,
    };

    const task = new ImportJSONTask();
    const response = await task.perform(props);

    expect(response.collections.size).toEqual(1);
    expect(response.documents.size).toEqual(2);
    expect(response.attachments.size).toEqual(1);
  });
});
