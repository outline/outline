/* eslint-disable @typescript-eslint/no-empty-function */
import path from "path";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import ImportNotionTask from "./ImportNotionTask";

describe("ImportNotionTask", () => {
  it("should import successfully from a Markdown export", async () => {
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
            "notion-markdown.zip"
          ),
          cleanup: async () => {},
        };
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
    expect(documents.map((d) => d.text).join("")).toContain(
      attachments[0].redirectUrl
    );
  });

  it("should import successfully from a HTML export", async () => {
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
            "notion-html.zip"
          ),
          cleanup: async () => {},
        };
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
    const attachment = attachments.find((att) =>
      att.key.endsWith("Screen_Shot_2022-04-21_at_2.23.26_PM.png")
    );

    const documents = Array.from(response.documents.values());
    expect(documents.map((d) => d.text).join("")).toContain(
      attachment?.redirectUrl
    );
  });
});
