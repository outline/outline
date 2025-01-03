import path from "path";
import fs from "fs-extra";
import { createContext } from "@server/context";
import Attachment from "@server/models/Attachment";
import { sequelize } from "@server/storage/database";
import { buildUser } from "@server/test/factories";
import documentImporter from "./documentImporter";

jest.mock("@server/storage/files");

describe("documentImporter", () => {
  it("should convert Word Document to markdown", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );

    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
    const attachments = await Attachment.count({
      where: {
        teamId: user.teamId,
      },
    });
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
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "application/octet-stream",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
    const attachments = await Attachment.count({
      where: {
        teamId: user.teamId,
      },
    });
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
      await sequelize.transaction((transaction) =>
        documentImporter({
          user,
          mimeType: "application/octet-stream",
          fileName,
          content,
          ctx: createContext({ user, transaction }),
        })
      );
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
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "application/octet-stream",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
    const attachments = await Attachment.count({
      where: {
        teamId: user.teamId,
      },
    });
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
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "text/html",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
    expect(response.text).toContain("Text paragraph");
    expect(response.title).toEqual("Heading 1");
  });

  it("should convert Confluence Word output to markdown", async () => {
    const user = await buildUser();
    const fileName = "confluence.doc";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "application/msword",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );

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
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "text/plain",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
    expect(response.text).toContain("This is a test paragraph");
    expect(response.title).toEqual("Heading 1");
  });

  it("should handle only title", async () => {
    const user = await buildUser();
    const fileName = "markdown.md";
    const content = `# Title`;
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "text/plain",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );

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
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "application/lol",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
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
      await sequelize.transaction((transaction) =>
        documentImporter({
          user,
          mimeType: "executable/zip",
          fileName,
          content,
          ctx: createContext({ user, transaction }),
        })
      );
    } catch (err) {
      error = err.message;
    }

    expect(error).toEqual("File type executable/zip not supported");
  });

  it("should escape dollar signs in HTML input", async () => {
    const user = await buildUser();
    const fileName = "test.html";
    const content = `
      <!DOCTYPE html>
      <html>
          <head>
              <title>Test</title>
          </head>
          <body>
            <p>$100</p>
          </body>
      </html>
    `;
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "text/html",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
    expect(response.text).toEqual("\\$100");
  });

  it("should not escape dollar signs in inline code in HTML input", async () => {
    const user = await buildUser();
    const fileName = "test.html";
    const content = `
      <!DOCTYPE html>
      <html>
          <head>
              <title>Test</title>
          </head>
          <body>
            <code>echo $foo</code>
          </body>
      </html>
    `;
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "text/html",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
    expect(response.text).toEqual("`echo $foo`");
  });

  it("should not escape dollar signs in code blocks in HTML input", async () => {
    const user = await buildUser();
    const fileName = "test.html";
    const content = `
      <!DOCTYPE html>
      <html>
          <head>
              <title>Test</title>
          </head>
          <body>
            <pre><code>echo $foo</code></pre>
          </body>
      </html>
    `;
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "text/html",
        fileName,
        content,
        ctx: createContext({ user, transaction }),
      })
    );
    expect(response.text).toEqual("```\necho $foo\n```");
  });
});
