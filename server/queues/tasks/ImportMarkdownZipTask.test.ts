import fs from "fs";
import path from "path";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import ImportMarkdownZipTask from "./ImportMarkdownZipTask";

describe("ImportMarkdownZipTask", () => {
  it("should import the documents, attachments", async () => {
    const fileOperation = await buildFileOperation();
    Object.defineProperty(fileOperation, "stream", {
      get() {
        return fs.createReadStream(
          path.resolve(__dirname, "..", "..", "test", "fixtures", "outline.zip")
        );
      },
    });
    jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);

    const props = {
      fileOperationId: fileOperation.id,
    };

    const task = new ImportMarkdownZipTask();
    const response = await task.perform(props);

    expect(response.collections.size).toEqual(1);
    expect(response.documents.size).toEqual(8);
    expect(response.attachments.size).toEqual(6);
  }, 10000);

  it("should throw an error with corrupt zip", async () => {
    const fileOperation = await buildFileOperation();
    Object.defineProperty(fileOperation, "stream", {
      get() {
        return fs.createReadStream(
          path.resolve(__dirname, "..", "..", "test", "fixtures", "corrupt.zip")
        );
      },
    });
    jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);

    const props = {
      fileOperationId: fileOperation.id,
    };

    let error;
    try {
      const task = new ImportMarkdownZipTask();
      await task.perform(props);
    } catch (err) {
      error = err;
    }

    expect(error && error.message).toBeTruthy();
  });

  it("should throw an error with empty collection in zip", async () => {
    const fileOperation = await buildFileOperation();
    Object.defineProperty(fileOperation, "stream", {
      get() {
        return fs.createReadStream(
          path.resolve(__dirname, "..", "..", "test", "fixtures", "empty.zip")
        );
      },
    });
    jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);

    const props = {
      fileOperationId: fileOperation.id,
    };

    let error;
    try {
      const task = new ImportMarkdownZipTask();
      await task.perform(props);
    } catch (err) {
      error = err;
    }

    expect(error && error.message).toBe(
      "Uploaded file does not contain any valid documents"
    );
  });
});
