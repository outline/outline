// @flow
import path from "path";
import File from "formidable/lib/file";
import { Attachment } from "../models";
import { buildUser } from "../test/factories";
import { flushdb } from "../test/support";
import documentImporter from "./documentImporter";

jest.mock("../utils/s3");

beforeEach(() => flushdb());

describe("documentImporter", () => {
  const ip = "127.0.0.1";

  it("should convert Word Document to markdown", async () => {
    const user = await buildUser();
    const name = "images.docx";
    const file = new File({
      name,
      type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      path: path.resolve(__dirname, "..", "test", "fixtures", name),
    });

    const response = await documentImporter({
      user,
      file,
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
    const name = "webpage.html";
    const file = new File({
      name,
      type: "text/html",
      path: path.resolve(__dirname, "..", "test", "fixtures", name),
    });

    const response = await documentImporter({
      user,
      file,
      ip,
    });

    expect(response.text).toContain("Text paragraph");
    expect(response.title).toEqual("Heading 1");
  });

  it("should load markdown", async () => {
    const user = await buildUser();
    const name = "markdown.md";
    const file = new File({
      name,
      type: "text/plain",
      path: path.resolve(__dirname, "..", "test", "fixtures", name),
    });

    const response = await documentImporter({
      user,
      file,
      ip,
    });

    expect(response.text).toContain("This is a test paragraph");
    expect(response.title).toEqual("Heading 1");
  });

  it("should error with unknown file type", async () => {
    const user = await buildUser();
    const name = "markdown.md";
    const file = new File({
      name,
      type: "executable/zip",
      path: path.resolve(__dirname, "..", "test", "fixtures", name),
    });

    let error;
    try {
      await documentImporter({
        user,
        file,
        ip,
      });
    } catch (err) {
      error = err.message;
    }

    expect(error).toEqual("File type executable/zip not supported");
  });
});
