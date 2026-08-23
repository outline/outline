import path from "node:path";
import fs from "fs-extra";
import { errToString } from "@shared/utils/error";
import { createContext } from "@server/context";
import Attachment from "@server/models/Attachment";
import { sequelize } from "@server/storage/database";
import { buildUser } from "@server/test/factories";
import { buildZip } from "@server/test/support";
import documentImporter from "./documentImporter";

vi.mock("@server/storage/files");

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

  it("should convert a TextPack bundle to markdown and turn its assets into attachments", async () => {
    const user = await buildUser();
    const fileName = "My Note.textpack";
    const content = await buildZip({
      "Note.textbundle/info.json": JSON.stringify({
        version: 2,
        type: "net.daringfireball.markdown",
      }),
      "Note.textbundle/text.markdown":
        "# My Note\n\nHello world!\n\n![a photo](assets/image.png)\n",
      "Note.textbundle/assets/image.png": Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64"
      ),
    });

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
    expect(response.text).toContain("Hello world!");
    expect(response.text).toContain("![a photo](/api/attachments.redirect?id=");
    expect(response.title).toEqual("My Note");
  });

  it("should turn a file embedded in HTML into an attachment", async () => {
    const user = await buildUser();
    const html = `<h1>Notes</h1><p><a href="data:application/pdf;base64,JVBERi0xLjQK">the spec</a></p>`;

    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "text/html",
        fileName: "notes.html",
        content: html,
        ctx: createContext({ user, transaction }),
      })
    );

    const attachments = await Attachment.count({
      where: {
        teamId: user.teamId,
      },
    });
    expect(attachments).toEqual(1);
    expect(response.text).toContain("[the spec](/api/attachments.redirect?id=");
    expect(response.text).not.toContain("data:application/pdf");
  });

  it("should not strip content after period in title", async () => {
    const user = await buildUser();
    const fileName = "01. test";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", "images.docx")
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
    expect(response.text).toContain("This is a test document for images");
    expect(response.title).toEqual("01. test");
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

  it("should error when a file with application/octet-stream mimetype has an unsupported extension", async () => {
    const user = await buildUser();
    const fileName = "corrupt.zip";
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
      error = errToString(err);
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

  it("should convert MHTML Document to markdown", async () => {
    const user = await buildUser();
    const fileName = "webpage.mhtml";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "multipart/related",
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
    expect(response.text).toContain("Text paragraph with a logo below");
    expect(response.text).toContain("/api/attachments.redirect?id=");
    expect(response.title).toEqual("Heading 1");
  });

  it("should convert an .eml Document to markdown, using the Subject as the title", async () => {
    const user = await buildUser();
    const fileName = "email-with-image.eml";
    const content = await fs.readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const response = await sequelize.transaction((transaction) =>
      documentImporter({
        user,
        mimeType: "message/rfc822",
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
    expect(response.text).toContain("Text paragraph with our logo");
    expect(response.text).toContain("![](/api/attachments.redirect?id=");
    expect(response.title).toEqual("Meeting notes");
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

  it("should convert frontmatter to yaml codeblock", async () => {
    const user = await buildUser();
    const fileName = "markdown-frontmatter.md";
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

    expect(response.text).toContain("```yaml");
    expect(response.text).toContain("title: Test Document");
    expect(response.text).toContain("date: 2024-01-15");
    expect(response.text).toContain("tags: [test, markdown]");
    expect(response.text).toContain("```");
    expect(response.text).toContain("This is content after frontmatter");
    expect(response.title).toEqual("Heading 1");
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
      error = errToString(err);
    }

    expect(error).toEqual("File type executable/zip not supported");
  });

  it("should preserve dollar signs in HTML input", async () => {
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
    expect(response.text).toEqual("$100");
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
    // Using .code-block class which the schema recognizes for code blocks
    const content = `
      <!DOCTYPE html>
      <html>
          <head>
              <title>Test</title>
          </head>
          <body>
            <div class="code-block" data-language="javascript"><pre><code>echo $foo
echo $bar</code></pre></div>
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
    expect(response.text).toEqual("```javascript\necho $foo\necho $bar\n```");
  });
});
