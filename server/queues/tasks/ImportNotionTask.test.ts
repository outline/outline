import fs from "fs";
import path from "path";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import ImportNotionTask from "./ImportNotionTask";

beforeEach(() => flushdb());

describe("ImportNotionTask", () => {
  it("should import successfully from a Markdown export", async () => {
    const fileOperation = await buildFileOperation();
    Object.defineProperty(fileOperation, "buffer", {
      get() {
        return fs.readFileSync(
          path.resolve(
            __dirname,
            "..",
            "..",
            "test",
            "fixtures",
            "notion-markdown.zip"
          )
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
    expect(response.documents.size).toEqual(6);
    expect(response.attachments.size).toEqual(1);

    // Check that the image url was replaced in the text with a redirect
    const attachments = Array.from(response.attachments.values());
    const documents = Array.from(response.documents.values());
    expect(documents[2].text).toContain(attachments[0].redirectUrl);
  });

  it("should import successfully from a HTML export", async () => {
    const fileOperation = await buildFileOperation();
    Object.defineProperty(fileOperation, "buffer", {
      get() {
        return fs.readFileSync(
          path.resolve(
            __dirname,
            "..",
            "..",
            "test",
            "fixtures",
            "notion-html.zip"
          )
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
    expect(response.documents.size).toEqual(6);
    expect(response.attachments.size).toEqual(4);

    // Check that the image url was replaced in the text with a redirect
    const attachments = Array.from(response.attachments.values());
    const documents = Array.from(response.documents.values());
    expect(documents[1].text).toContain(attachments[1].redirectUrl);
  });
});
