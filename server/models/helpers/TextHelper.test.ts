// @vitest-isolate true
import { createContext } from "@server/context";
import {
  buildAttachment,
  buildProseMirrorDoc,
  buildUser,
} from "@server/test/factories";
import { ProsemirrorHelper } from "./ProsemirrorHelper";
import { TextHelper } from "./TextHelper";

vi.mock("@server/storage/files");

describe("ProsemirrorHelper", () => {
  describe("replaceImagesWithAttachments", () => {
    it("should return the same document when there are no images", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "No images here" }],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      expect(result.toJSON()).toEqual(doc.toJSON());
    });

    it("should correctly identify images in a document", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "https://example.com/image.png",
                alt: "Test image",
              },
            },
          ],
        },
      ]);

      const images = ProsemirrorHelper.getImages(doc);
      expect(images.length).toBe(1);
      expect(images[0].attrs.src).toBe("https://example.com/image.png");
      expect(images[0].attrs.alt).toBe("Test image");
    });

    it("should skip images with invalid URLs", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "not-a-valid-url",
                alt: "Invalid",
              },
            },
          ],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      // Document should remain unchanged since URL is invalid
      expect(result.toJSON()).toEqual(doc.toJSON());
    });

    it("should skip images with internal URLs", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "/api/attachments.redirect?id=existing-id",
                alt: "Internal",
              },
            },
          ],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      // Document should remain unchanged since URL is internal
      expect(result.toJSON()).toEqual(doc.toJSON());
    });

    it("should handle document with multiple node types", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Some text" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "invalid-url",
                alt: "Image",
              },
            },
          ],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      // Document structure should be preserved
      expect(result.content.childCount).toBe(3);
      expect(result.content.child(0).type.name).toBe("heading");
      expect(result.content.child(1).type.name).toBe("paragraph");
      expect(result.content.child(2).type.name).toBe("paragraph");
    });

    it("should handle empty document", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      expect(result.toJSON()).toEqual(doc.toJSON());
    });
  });
});

describe("TextHelper", () => {
  describe("attachmentsToSignedUrls", () => {
    it("should return the text when there are no attachments", async () => {
      const user = await buildUser();
      const text = "<p>No attachments here</p>";

      const result = await TextHelper.attachmentsToSignedUrls(
        text,
        user.teamId
      );

      expect(result).toEqual(text);
    });

    it("should replace each attachment url with a signed url", async () => {
      const user = await buildUser();
      const first = await buildAttachment({
        teamId: user.teamId,
        userId: user.id,
      });
      const second = await buildAttachment({
        teamId: user.teamId,
        userId: user.id,
      });
      const text = `<img src="${first.redirectUrl}"><img src="${second.redirectUrl}"><a href="${first.redirectUrl}">file</a>`;

      const result = await TextHelper.attachmentsToSignedUrls(
        text,
        user.teamId
      );

      const urls = Array.from(
        result.matchAll(/(?:src|href)="([^"]+)"/g),
        (match) => match[1]
      );

      expect(result).not.toContain("/api/attachments.redirect");
      expect(urls).toHaveLength(3);
      expect(urls[0]).not.toEqual(urls[1]);
      expect(urls[2]).toEqual(urls[0]);
    });

    it("should not sign attachments from another team", async () => {
      const user = await buildUser();
      const attachment = await buildAttachment();
      const text = `<img src="${attachment.redirectUrl}">`;

      const result = await TextHelper.attachmentsToSignedUrls(
        text,
        user.teamId
      );

      expect(result).toEqual(text);
    });
  });
});
