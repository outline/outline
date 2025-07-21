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

  describe("filename title extraction", () => {
    it("should preserve folder names with dots", async () => {
      const user = await buildUser();
      const testCases = [
        { fileName: "01. Introduction", expectedTitle: "01. Introduction" },
        {
          fileName: "02. Getting Started",
          expectedTitle: "02. Getting Started",
        },
        {
          fileName: "Chapter 1. Overview",
          expectedTitle: "Chapter 1. Overview",
        },
        {
          fileName: "Section 3.1 Details",
          expectedTitle: "Section 3.1 Details",
        },
      ];

      for (const { fileName, expectedTitle } of testCases) {
        const response = await sequelize.transaction((transaction) =>
          documentImporter({
            user,
            mimeType: "text/markdown",
            fileName,
            content: "# Test content",
            ctx: createContext({ user, transaction }),
          })
        );
        expect(response.title).toEqual(expectedTitle);
      }
    });

    it("should remove known file extensions", async () => {
      const user = await buildUser();
      const testCases = [
        { fileName: "document.md", expectedTitle: "document" },
        { fileName: "file.markdown", expectedTitle: "file" },
        { fileName: "spreadsheet.csv", expectedTitle: "spreadsheet" },
        { fileName: "webpage.html", expectedTitle: "webpage" },
        { fileName: "word-doc.docx", expectedTitle: "word-doc" },
        { fileName: "notes.txt", expectedTitle: "notes" },
      ];

      for (const { fileName, expectedTitle } of testCases) {
        const response = await sequelize.transaction((transaction) =>
          documentImporter({
            user,
            mimeType: "text/markdown",
            fileName,
            content: "# Test content",
            ctx: createContext({ user, transaction }),
          })
        );
        expect(response.title).toEqual(expectedTitle);
      }
    });

    it("should handle files with multiple dots correctly", async () => {
      const user = await buildUser();
      const testCases = [
        { fileName: "file.with.dots.md", expectedTitle: "file.with.dots" },
        { fileName: "version.1.2.html", expectedTitle: "version.1.2" },
        { fileName: "data.backup.csv", expectedTitle: "data.backup" },
        { fileName: "my.document.v2.docx", expectedTitle: "my.document.v2" },
      ];

      for (const { fileName, expectedTitle } of testCases) {
        const response = await sequelize.transaction((transaction) =>
          documentImporter({
            user,
            mimeType: "text/markdown",
            fileName,
            content: "# Test content",
            ctx: createContext({ user, transaction }),
          })
        );
        expect(response.title).toEqual(expectedTitle);
      }
    });

    it("should preserve files without known extensions", async () => {
      const user = await buildUser();
      const testCases = [
        { fileName: "README", expectedTitle: "README" },
        { fileName: "file.unknown", expectedTitle: "file.unknown" },
        { fileName: "script.py", expectedTitle: "script.py" },
        { fileName: "config.json", expectedTitle: "config.json" },
      ];

      for (const { fileName, expectedTitle } of testCases) {
        const response = await sequelize.transaction((transaction) =>
          documentImporter({
            user,
            mimeType: "text/markdown",
            fileName,
            content: "# Test content",
            ctx: createContext({ user, transaction }),
          })
        );
        expect(response.title).toEqual(expectedTitle);
      }
    });

    it("should handle case-insensitive extensions", async () => {
      const user = await buildUser();
      const testCases = [
        { fileName: "document.MD", expectedTitle: "document" },
        { fileName: "file.HTML", expectedTitle: "file" },
        { fileName: "data.CSV", expectedTitle: "data" },
        { fileName: "word.DOCX", expectedTitle: "word" },
      ];

      for (const { fileName, expectedTitle } of testCases) {
        const response = await sequelize.transaction((transaction) =>
          documentImporter({
            user,
            mimeType: "text/markdown",
            fileName,
            content: "# Test content",
            ctx: createContext({ user, transaction }),
          })
        );
        expect(response.title).toEqual(expectedTitle);
      }
    });
  });
});
