import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import {
  buildUser,
  buildCollection,
  buildDocument,
  buildFileOperation,
} from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import documentCreator from "./documentCreator";

describe("documentCreator", () => {
  describe("content vs text priority", () => {
    it("should prioritize content over text when both are provided", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const testText = "This is plain text";
      const testContent = ProsemirrorHelper.toProsemirror(
        "This is rich content"
      ).toJSON();

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "Test Document",
          text: testText,
          content: testContent,
          collectionId: collection.id,
        })
      );

      expect(document.content).toEqual(testContent);
      expect(document.text).toContain("This is rich content");
      expect(document.text).not.toContain("This is plain text");
    });

    it("should use text when content is not provided", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const testText = "This is plain text";

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "Test Document",
          text: testText,
          collectionId: collection.id,
        })
      );

      expect(document.text).toContain("This is plain text");
    });

    it("should create empty document when neither content nor text is provided", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "Empty Document",
          collectionId: collection.id,
        })
      );

      expect(document.text).toBe("");
      expect(document.title).toBe("Empty Document");
    });
  });

  describe("basic document creation", () => {
    it("should create a basic document", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "Test Document",
          text: "This is a test document",
          collectionId: collection.id,
        })
      );

      expect(document.title).toBe("Test Document");
      expect(document.text).toContain("This is a test document");
      expect(document.collectionId).toBe(collection.id);
      expect(document.createdById).toBe(user.id);
      expect(document.lastModifiedById).toBe(user.id);
      expect(document.teamId).toBe(user.teamId);
    });

    it("should create document with custom properties", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "Custom Document",
          text: "Custom content",
          icon: "📄",
          color: "#FF0000",
          fullWidth: true,
          collectionId: collection.id,
        })
      );

      expect(document.icon).toBe("📄");
      expect(document.color).toBe("#FF0000");
      expect(document.fullWidth).toBe(true);
    });

    it("should create document as draft when publish is false", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "Draft Document",
          text: "Draft content",
          collectionId: collection.id,
          publish: false,
        })
      );

      expect(document.publishedAt).toBeNull();
    });

    it("should publish document when publish is true", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "Published Document",
          text: "Published content",
          collectionId: collection.id,
          publish: true,
        })
      );

      expect(document.publishedAt).toBeInstanceOf(Date);
    });

    it("should throw error when trying to publish without collection", async () => {
      const user = await buildUser();

      await expect(
        withAPIContext(user, (ctx) =>
          documentCreator(ctx, {
            title: "Invalid Document",
            text: "Content",
            publish: true,
          })
        )
      ).rejects.toThrow("Collection ID is required to publish");
    });
  });

  describe("template document handling", () => {
    it("should create document from template", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const templateDocument = await buildDocument({
        title: "Template Document",
        text: "Template content",
        icon: "📋",
        color: "#00FF00",
        fullWidth: true,
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "From Template",
          templateDocument,
          collectionId: collection.id,
        })
      );

      expect(document.title).toBe("From Template");
      expect(document.icon).toBe("📋");
      expect(document.color).toBe("#00FF00");
      expect(document.fullWidth).toBe(true);
    });

    it("should use template title when no title provided", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const templateDocument = await buildDocument({
        title: "Template Title",
        text: "Template content",
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          templateDocument,
          collectionId: collection.id,
        })
      );

      expect(document.title).toBe("Template Title");
    });

    it("should throw error when state is provided with template", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const templateDocument = await buildDocument({
        title: "Template Document",
        text: "Template content",
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      await expect(
        withAPIContext(user, (ctx) =>
          documentCreator(ctx, {
            templateDocument,
            state: Buffer.from("some state"),
            collectionId: collection.id,
          })
        )
      ).rejects.toThrow(
        "State cannot be set when creating a document from a template"
      );
    });

    it("should handle template flag correctly", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const templateDocument = await buildDocument({
        title: "Template Document",
        text: "Template content",
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          templateDocument,
          template: true,
          collectionId: collection.id,
        })
      );

      expect(document.template).toBe(true);
      expect(document.templateId).toBe(templateDocument.id);
    });
  });

  describe("parent document handling", () => {
    it("should create child document", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const parentDocument = await buildDocument({
        title: "Parent Document",
        text: "Parent content",
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "Child Document",
          text: "Child content",
          parentDocumentId: parentDocument.id,
          collectionId: collection.id,
        })
      );

      expect(document.parentDocumentId).toBe(parentDocument.id);
    });
  });

  describe("import handling", () => {
    it("should handle import metadata", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });

      const fileOperation = await buildFileOperation({
        teamId: user.teamId,
      });

      const sourceMetadata = { fileName: "test" };

      const document = await withAPIContext(user, (ctx) =>
        documentCreator(ctx, {
          title: "fileOperation Document",
          text: "fileOperation content",
          importId: fileOperation.id,
          sourceMetadata,
          collectionId: collection.id,
        })
      );

      expect(document.importId).toBe(fileOperation.id);
      expect(document.sourceMetadata).toEqual(sourceMetadata);
    });
  });
});
