/* oxlint-disable @typescript-eslint/no-empty-function */
import path from "path";
import { FileOperation } from "@server/models";
import { buildFileOperation } from "@server/test/factories";
import ImportMarkdownZipTask from "./ImportMarkdownZipTask";
import ImportHelper from "@server/utils/ImportHelper";
import { Buckets } from "@server/models/helpers/AttachmentHelper";
import fs from "fs-extra";
import { sequelize } from "@server/storage/database";
import * as documentImporterModule from "@server/commands/documentImporter";

describe("ImportMarkdownZipTask", () => {
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
            "outline-markdown.zip"
          ),
          cleanup: async () => { },
        };
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

  it("should import the documents, public attachments", async () => {
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
            "outline-markdown-public.zip"
          ),
          cleanup: async () => { },
        };
      },
    });
    jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);

    const props = {
      fileOperationId: fileOperation.id,
    };

    const task = new ImportMarkdownZipTask();
    const response = await task.perform(props);

    expect(response.collections.size).toEqual(1);
    expect(response.documents.size).toEqual(2);
    expect(response.attachments.size).toEqual(1);
  }, 10000);

  it("should throw an error with corrupt zip", async () => {
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
            "corrupt.zip"
          ),
          cleanup: async () => { },
        };
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
    Object.defineProperty(fileOperation, "handle", {
      get() {
        return {
          path: path.resolve(
            __dirname,
            "..",
            "..",
            "test",
            "fixtures",
            "empty.zip"
          ),
          cleanup: async () => { },
        };
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

    expect(error && error.message).toContain(
      "Uploaded file does not contain any valid collections"
    );
  });

  it("should handle root documents and complex relative links", async () => {
    const fileOperation = await buildFileOperation();
    const id1 = "doc1-uuid";
    const id2 = "doc2-uuid";
    const imgId = "img-uuid";

    jest.spyOn(FileOperation, "findByPk").mockResolvedValue(fileOperation);

    // Mock tree structure
    const mockTree = {
      title: "root",
      name: "root",
      path: "/tmp/zip",
      children: [
        {
          title: "Root Doc",
          name: "root-doc.md",
          path: "/tmp/zip/root-doc.md",
          children: [],
        },
        {
          title: "Images",
          name: "images",
          path: "/tmp/zip/images",
          children: [
            {
              title: "Logo",
              name: "logo.png",
              path: "/tmp/zip/images/logo.png",
              children: [],
            },
          ],
        },
        {
          title: "Subfolder",
          name: "subfolder",
          path: "/tmp/zip/subfolder",
          children: [
            {
              title: "Child Doc",
              name: "child-doc.md",
              path: "/tmp/zip/subfolder/child-doc.md",
              children: [],
            },
          ],
        },
      ],
    };

    jest.spyOn(ImportHelper, "toFileTree").mockResolvedValue(mockTree);
    jest.spyOn(fs, "readFile").mockImplementation(async (filePath: string) => {
      if (filePath.endsWith("root-doc.md")) {
        return Buffer.from("Link to [Child](subfolder/child-doc.md) and image ![Logo](images/logo.png)");
      }
      if (filePath.endsWith("child-doc.md")) {
        return Buffer.from("Back to [Root](../root-doc.md)");
      }
      return Buffer.from("image-content");
    });

    jest.spyOn(sequelize, "transaction").mockImplementation(async (cb: any) => cb());
    jest.spyOn(documentImporterModule, "default").mockImplementation(async (args: any) => ({
      title: args.fileName.replace(".md", ""),
      text: args.content ? args.content.toString() : "",
      icon: null,
    }));

    const task = new ImportMarkdownZipTask();
    const response = await task.parseData("/tmp/zip", fileOperation);

    // Verify Collections
    // 1. "Imported" for root-doc.md
    // 2. "Subfolder" for subfolder/child-doc.md
    // "Images" should NOT be a collection
    expect(response.collections.length).toEqual(2);
    expect(response.collections.map(c => c.name)).toContain("Imported");
    expect(response.collections.map(c => c.name)).toContain("Subfolder");
    expect(response.collections.map(c => c.name)).not.toContain("Images");

    // Verify Documents
    expect(response.documents.length).toEqual(2);
    const rootDoc = response.documents.find(d => d.title === "root-doc");
    const childDoc = response.documents.find(d => d.title === "child-doc");

    expect(rootDoc).toBeDefined();
    expect(childDoc).toBeDefined();

    // Verify Links in Root Doc
    const logoAttachment = response.attachments.find(a => a.name === "logo.png");
    expect(logoAttachment).toBeDefined();

    expect(rootDoc!.text).toContain(`<<${childDoc!.id}>>`);
    expect(rootDoc!.text).toContain(`<<${logoAttachment!.id}>>`);

    // Verify Links in Child Doc
    expect(childDoc!.text).toContain(`<<${rootDoc!.id}>>`);
  });
});
