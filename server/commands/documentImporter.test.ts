import path from "path";
import fs from "fs-extra";
import Attachment from "@server/models/Attachment";
import { buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import documentImporter from "./documentImporter";

jest.mock("@server/storage/files");

setupTestDatabase();

describe("documentImporter", () => {
  const ip = "127.0.0.1";

  it("should convert Word Document to markdown", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const response = await documentImporter({
      user,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileName,
      content,
      ip,
    });
    const attachments = await Attachment.count();
    expect(attachments).toEqual(1);
    expect(response.text).toContain("This is a test document for images");
    expect(response.text).toContain("![](/api/attachments.redirect?id=");
    expect(response.title).toEqual("images");
  });

  it("should convert Word Document to markdown for application/octet-stream mimetype", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const response = await documentImporter({
      user,
      mimeType: "application/octet-stream",
      fileName,
      content,
      ip,
    });
    const attachments = await Attachment.count();
    expect(attachments).toEqual(1);
    expect(response.text).toContain("This is a test document for images");
    expect(response.text).toContain("![](/api/attachments.redirect?id=");
    expect(response.title).toEqual("images");
  });

  it("should error when a file with application/octet-stream mimetype doesn't have .docx extension", async () => {
    const user = await buildUser();
    const fileName = "normal.docx.txt";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    let error;

    try {
      await documentImporter({
        user,
        mimeType: "application/octet-stream",
        fileName,
        content,
        ip,
      });
    } catch (err) {
      error = err.message;
    }

    expect(error).toEqual("File type application/octet-stream not supported");
  });

  it("should convert Word Document on Windows to markdown", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const response = await documentImporter({
      user,
      mimeType: "application/octet-stream",
      fileName,
      content,
      ip,
    });
    const attachments = await Attachment.count();
    expect(attachments).toEqual(1);
    expect(response.text).toContain("This is a test document for images");
    expect(response.text).toContain("![](/api/attachments.redirect?id=");
    expect(response.title).toEqual("images");
  });

  it("should convert HTML Document to markdown", async () => {
    const user = await buildUser();
    const fileName = "webpage.html";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      "utf8"
    );
    const response = await documentImporter({
      user,
      mimeType: "text/html",
      fileName,
      content,
      ip,
    });
    expect(response.text).toContain("Text paragraph");
    expect(response.title).toEqual("Heading 1");
  });

  it("should convert Confluence Word output to markdown", async () => {
    const user = await buildUser();
    const fileName = "confluence.doc";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const response = await documentImporter({
      user,
      mimeType: "application/msword",
      fileName,
      content,
      ip,
    });
    expect(response.text).toContain("this is a test document");
    expect(response.title).toEqual("Heading 1");
  });

  it("should load markdown", async () => {
    const user = await buildUser();
    const fileName = "markdown.md";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      "utf8"
    );
    const response = await documentImporter({
      user,
      mimeType: "text/plain",
      fileName,
      content,
      ip,
    });
    expect(response.text).toContain("This is a test paragraph");
    expect(response.title).toEqual("Heading 1");
  });

  it("should handle only title", async () => {
    const user = await buildUser();
    const fileName = "markdown.md";
    const content = `# Title`;
    const response = await documentImporter({
      user,
      mimeType: "text/plain",
      fileName,
      content,
      ip,
    });
    expect(response.text).toEqual("");
    expect(response.title).toEqual("Title");
  });

  it("should fallback to extension if mimetype unknown", async () => {
    const user = await buildUser();
    const fileName = "markdown.md";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      "utf8"
    );
    const response = await documentImporter({
      user,
      mimeType: "application/lol",
      fileName,
      content,
      ip,
    });
    expect(response.text).toContain("This is a test paragraph");
    expect(response.title).toEqual("Heading 1");
  });

  it("should error with unknown file type", async () => {
    const user = await buildUser();
    const fileName = "empty.zip";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    let error;

    try {
      await documentImporter({
        user,
        mimeType: "executable/zip",
        fileName,
        content,
        ip,
      });
    } catch (err) {
      error = err.message;
    }

    expect(error).toEqual("File type executable/zip not supported");
  });
});
