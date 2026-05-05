import { randomUUID } from "node:crypto";
import * as Y from "yjs";
import { TextEditMode } from "@shared/types";
import { APIUpdateExtension } from "@server/collaboration/APIUpdateExtension";
import { Event } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { buildDocument, buildUser } from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import documentUpdater from "./documentUpdater";

describe("documentUpdater", () => {
  it("should change lastModifiedById", async () => {
    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
    });

    document = await withAPIContext(user, (ctx) =>
      documentUpdater(ctx, {
        text: "Changed",
        document,
      })
    );

    const event = await Event.findLatest({
      teamId: user.teamId,
    });
    expect(document.lastModifiedById).toEqual(user.id);
    expect(event!.name).toEqual("documents.update");
    expect(event!.documentId).toEqual(document.id);
  });

  it("should change lastModifiedById when republishing an already published document", async () => {
    const user = await buildUser();
    const creator = await buildUser({ teamId: user.teamId });
    let document = await buildDocument({
      teamId: user.teamId,
      userId: creator.id,
    });

    document = await withAPIContext(user, (ctx) =>
      documentUpdater(ctx, {
        text: "Changed",
        publish: true,
        document,
      })
    );

    expect(document.createdById).toEqual(creator.id);
    expect(document.lastModifiedById).toEqual(user.id);
  });

  it("should not change lastModifiedById or generate event if nothing changed", async () => {
    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
    });

    document = await withAPIContext(user, (ctx) =>
      documentUpdater(ctx, {
        title: document.title,
        document,
      })
    );

    expect(document.lastModifiedById).not.toEqual(user.id);
  });

  it("should notify collaboration server when text changes", async () => {
    const notifyUpdateSpy = vi
      .spyOn(APIUpdateExtension, "notifyUpdate")
      .mockResolvedValue(undefined);

    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
      text: "Initial text",
    });

    // Create initial collaborative state (simulating an active collaboration session)
    const ydoc = ProsemirrorHelper.toYDoc("Initial text");
    document.state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
    await document.save();

    document = await withAPIContext(user, (ctx) =>
      documentUpdater(ctx, {
        text: "Changed content",
        document,
      })
    );

    expect(notifyUpdateSpy).toHaveBeenCalledWith(document.id, user.id);
    notifyUpdateSpy.mockRestore();
  });

  it("should not notify collaboration server when only title changes", async () => {
    const notifyUpdateSpy = vi
      .spyOn(APIUpdateExtension, "notifyUpdate")
      .mockResolvedValue(undefined);

    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
    });

    document = await withAPIContext(user, (ctx) =>
      documentUpdater(ctx, {
        title: "New Title",
        document,
      })
    );

    expect(notifyUpdateSpy).not.toHaveBeenCalled();
    notifyUpdateSpy.mockRestore();
  });

  describe("replace", () => {
    it("should update document content when changing text", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "Changed",
          document,
        })
      );

      expect(document.text).toEqual("Changed");
      expect(document.content).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Changed",
              },
            ],
          },
        ],
      });
    });
  });

  describe("append", () => {
    it("should append document content when requested", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "Initial",
      });

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "Appended",
          document,
          editMode: TextEditMode.Append,
        })
      );

      expect(document.text).toEqual("InitialAppended");
      expect(document.content).toMatchObject({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "InitialAppended" }],
          },
        ],
      });
    });

    it("should preserve rich content when appending", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "**Bold**",
      });

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "Appended",
          document,
          editMode: TextEditMode.Append,
        })
      );

      expect(document.content).toMatchObject({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [{ type: "strong" }],
                text: "Bold",
              },
              {
                type: "text",
                text: "Appended",
              },
            ],
          },
        ],
      });
    });

    it("should preserve rich content from JSON when appending", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const id = randomUUID();
      document.content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [{ type: "comment", attrs: { id, userId: id } }],
                text: "Italic",
              },
            ],
          },
        ],
      };
      await document.save();

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "Appended",
          document,
          editMode: TextEditMode.Append,
        })
      );

      expect(document.content).toMatchObject({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [{ type: "comment", attrs: { id, userId: id } }],
                text: "Italic",
              },
              {
                type: "text",
                text: "Appended",
              },
            ],
          },
        ],
      });
    });

    it("should create new paragraph when appending with newline", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "Initial",
      });

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "\n\nAppended",
          document,
          editMode: TextEditMode.Append,
        })
      );

      expect(document.text).toEqual("Initial\n\nAppended");
      expect(document.content).toMatchObject({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Initial" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Appended" }],
          },
        ],
      });
    });
  });

  describe("prepend", () => {
    it("should prepend document content when requested", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "Existing",
      });

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "Prepended",
          document,
          editMode: TextEditMode.Prepend,
        })
      );

      expect(document.text).toEqual("PrependedExisting");
      expect(document.content).toMatchObject({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "PrependedExisting" }],
          },
        ],
      });
    });

    it("should preserve rich content when prepending", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "**Bold**",
      });

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "Prepended",
          document,
          editMode: TextEditMode.Prepend,
        })
      );

      expect(document.content).toMatchObject({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Prepended",
              },
              {
                type: "text",
                marks: [{ type: "strong" }],
                text: "Bold",
              },
            ],
          },
        ],
      });
    });

    it("should create new paragraph when prepending with newline", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "Existing",
      });

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "Prepended\n\n",
          document,
          editMode: TextEditMode.Prepend,
        })
      );

      expect(document.text).toEqual("Prepended\n\nExisting");
      expect(document.content).toMatchObject({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Prepended" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Existing" }],
          },
        ],
      });
    });
  });

  describe("patch", () => {
    it("should patch specific text in document content", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "Hello world\n\nThis is a test",
      });

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Hello earth",
        TextEditMode.Patch,
        "Hello world"
      );
      const content = result.content!.content!;

      expect(content).toHaveLength(2);
      expect(content[0]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "Hello earth" }],
      });
      expect(content[1]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "This is a test" }],
      });
    });

    it("should throw when findText is not found in document", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        teamId: user.teamId,
        text: "Hello world",
      });

      await expect(
        withAPIContext(user, (ctx) =>
          documentUpdater(ctx, {
            text: "replacement",
            findText: "nonexistent text",
            document,
            editMode: TextEditMode.Patch,
          })
        )
      ).rejects.toThrow("The specified text was not found in the document");
    });

    it("should handle dollar signs in replacement text literally", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "The price is TBD",
      });

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "$100 & $200",
        TextEditMode.Patch,
        "TBD"
      );
      const content = result.content!.content!;

      expect(content).toHaveLength(1);
      expect(content[0]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "The price is $100 & $200" }],
      });
    });

    it("should delete matched text when replacement is empty string", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "Hello beautiful world",
      });

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "",
        TextEditMode.Patch,
        "beautiful "
      );
      const content = result.content!.content!;

      expect(content).toHaveLength(1);
      expect(content[0]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "Hello world" }],
      });
    });

    it("should handle multi-block replacement in a single paragraph", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });

      document.content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Replace this text here" }],
          },
        ],
      };
      await document.save();

      // Replace with content that parses to multiple blocks
      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "First paragraph\n\nSecond paragraph",
        TextEditMode.Patch,
        "Replace this text here"
      );
      const content = result.content!.content!;

      // Should produce two paragraphs, not silently drop the second
      expect(content.length).toBeGreaterThanOrEqual(2);
      expect(content[0]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "First paragraph" }],
      });
      expect(content[1]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "Second paragraph" }],
      });
    });

    it("should patch multi-block content", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "# Heading\n\nOld content\n\nKeep this",
      });

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "# New Heading\n\nNew content",
        TextEditMode.Patch,
        "# Heading\n\nOld content"
      );
      const content = result.content!.content!;

      expect(content).toHaveLength(3);
      expect(content[0]).toMatchObject({
        type: "heading",
        content: [{ type: "text", text: "New Heading" }],
      });
      expect(content[1]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "New content" }],
      });
      expect(content[2]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "Keep this" }],
      });
    });

    it("should patch the middle item in a list", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "- First item\n- Second item\n- Third item",
      });

      document = await withAPIContext(user, (ctx) =>
        documentUpdater(ctx, {
          text: "* Updated item",
          findText: "* Second item",
          document,
          editMode: TextEditMode.Patch,
        })
      );

      const listItem = (text: string) => ({
        type: "list_item",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      });

      expect(document.content).toMatchObject({
        type: "doc",
        content: [
          {
            type: "bullet_list",
            content: [
              listItem("First item"),
              listItem("Updated item"),
              listItem("Third item"),
            ],
          },
        ],
      });
    });

    it("should preserve comment marks on untouched blocks when patching", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const commentId = randomUUID();

      // Build content with a comment mark (not representable in markdown)
      // on the LAST paragraph, then patch the FIRST paragraph.
      document.content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "First paragraph" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [
                  {
                    type: "comment",
                    attrs: { id: commentId, userId: commentId },
                  },
                ],
                text: "Commented text",
              },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Third paragraph" }],
          },
        ],
      };
      await document.save();

      // Capture the ProseMirror JSON of untouched blocks BEFORE patching
      // (with schema defaults already applied via toProsemirror → toJSON)
      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const secondParaBefore = beforeDoc.content[1];
      const thirdParaBefore = beforeDoc.content[2];

      // Call DocumentHelper directly to inspect the ProseMirror result
      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Updated first",
        TextEditMode.Patch,
        "First paragraph"
      );
      const content = result.content!.content!;

      // Verify untouched blocks are byte-for-byte identical
      expect(content[1]).toEqual(secondParaBefore);
      expect(content[2]).toEqual(thirdParaBefore);

      // Verify the patched block was actually updated
      expect(content[0]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "Updated first" }],
      });

      // Verify we still have exactly 3 blocks
      expect(content).toHaveLength(3);
    });

    it("should preserve comment marks when patching a later block", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const commentId = randomUUID();

      // Comment mark on the FIRST paragraph, patch the THIRD.
      document.content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [
                  {
                    type: "comment",
                    attrs: { id: commentId, userId: commentId },
                  },
                ],
                text: "Commented text",
              },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Middle paragraph" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Last paragraph" }],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const firstParaBefore = beforeDoc.content[0];
      const secondParaBefore = beforeDoc.content[1];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Updated last",
        TextEditMode.Patch,
        "Last paragraph"
      );
      const content = result.content!.content!;

      // Both untouched blocks must be identical
      expect(content[0]).toEqual(firstParaBefore);
      expect(content[1]).toEqual(secondParaBefore);

      // Patched block updated
      expect(content[2]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "Updated last" }],
      });
      expect(content).toHaveLength(3);
    });

    it("should preserve comment marks in complex document when patching middle content", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const commentId = randomUUID();

      // Complex document: heading, paragraph with comment, bullet list, paragraph to patch
      document.content = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Section Title" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [
                  {
                    type: "comment",
                    attrs: { id: commentId, userId: commentId },
                  },
                ],
                text: "This has a comment",
              },
            ],
          },
          {
            type: "bullet_list",
            content: [
              {
                type: "list_item",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Item one" }],
                  },
                ],
              },
              {
                type: "list_item",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Item two" }],
                  },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Final paragraph to edit" }],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Edited final paragraph",
        TextEditMode.Patch,
        "Final paragraph to edit"
      );
      const content = result.content!.content!;

      // All three untouched blocks must be byte-for-byte identical
      expect(content[0]).toEqual(beforeDoc.content[0]);
      expect(content[1]).toEqual(beforeDoc.content[1]);
      expect(content[2]).toEqual(beforeDoc.content[2]);

      // Patched block updated
      expect(content[3]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "Edited final paragraph" }],
      });
      expect(content).toHaveLength(4);
    });

    it("should preserve comment mark when patching adjacent text in the same paragraph", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const commentId = randomUUID();

      // Paragraph: "Hello world " + "commented"(with comment mark) + " end"
      document.content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello world " },
              {
                type: "text",
                marks: [
                  {
                    type: "comment",
                    attrs: { id: commentId, userId: commentId },
                  },
                ],
                text: "commented",
              },
              { type: "text", text: " end" },
            ],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const commentNode = beforeDoc.content[0].content[1];
      const endNode = beforeDoc.content[0].content[2];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Goodbye world ",
        TextEditMode.Patch,
        "Hello world "
      );
      const content = result.content!.content!;

      expect(content).toHaveLength(1);
      // Comment mark and trailing text must be preserved exactly
      expect(content[0]).toMatchObject({
        type: "paragraph",
        content: [
          { type: "text", text: "Goodbye world " },
          commentNode,
          endNode,
        ],
      });
    });

    it("should preserve rich content in other checklist items when patching one item", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const commentId = randomUUID();

      // Checklist with 3 items; second item has a comment mark
      document.content = {
        type: "doc",
        content: [
          {
            type: "checkbox_list",
            content: [
              {
                type: "checkbox_item",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "First task" }],
                  },
                ],
              },
              {
                type: "checkbox_item",
                attrs: { checked: true },
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        marks: [
                          {
                            type: "comment",
                            attrs: { id: commentId, userId: commentId },
                          },
                        ],
                        text: "Commented task",
                      },
                    ],
                  },
                ],
              },
              {
                type: "checkbox_item",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Third task" }],
                  },
                ],
              },
            ],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const secondItem = beforeDoc.content[0].content[1];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Updated task",
        TextEditMode.Patch,
        "First task"
      );
      const list = result.content!.content![0];

      // The second checklist item with its comment mark must be preserved
      expect(list.content![1]).toEqual(secondItem);

      // The first item should be updated
      expect(list.content![0].content![0].content![0].text).toEqual(
        "Updated task"
      );

      // All three items should still exist
      expect(list.content).toHaveLength(3);
    });

    it("should patch checklist item checked state while preserving rich content in siblings", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const commentId = randomUUID();

      document.content = {
        type: "doc",
        content: [
          {
            type: "checkbox_list",
            content: [
              {
                type: "checkbox_item",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Buy groceries" }],
                  },
                ],
              },
              {
                type: "checkbox_item",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        marks: [
                          {
                            type: "comment",
                            attrs: { id: commentId, userId: commentId },
                          },
                        ],
                        text: "Review PR",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const secondItem = beforeDoc.content[0].content[1];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "- [x] Buy groceries",
        TextEditMode.Patch,
        "- [ ] Buy groceries"
      );
      const list = result.content!.content![0];

      // Checked state should be updated
      expect(list.content![0].attrs!.checked).toBe(true);

      // Text should remain the same
      expect(list.content![0].content![0].content![0].text).toEqual(
        "Buy groceries"
      );

      // Second item with comment mark must be preserved exactly
      expect(list.content![1]).toEqual(secondItem);
    });

    it("should uncheck a checkbox item while preserving rich content in siblings", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const commentId = randomUUID();

      // First item is checked, second has a comment mark
      document.content = {
        type: "doc",
        content: [
          {
            type: "checkbox_list",
            content: [
              {
                type: "checkbox_item",
                attrs: { checked: true },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Buy groceries" }],
                  },
                ],
              },
              {
                type: "checkbox_item",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        marks: [
                          {
                            type: "comment",
                            attrs: { id: commentId, userId: commentId },
                          },
                        ],
                        text: "Review PR",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const secondItem = beforeDoc.content[0].content[1];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "- [ ] Buy groceries",
        TextEditMode.Patch,
        "- [x] Buy groceries"
      );
      const list = result.content!.content![0];

      // Checked state should be updated to false
      expect(list.content![0].attrs!.checked).toBe(false);

      // Text should remain the same
      expect(list.content![0].content![0].content![0].text).toEqual(
        "Buy groceries"
      );

      // Second item with comment mark must be preserved exactly
      expect(list.content![1]).toEqual(secondItem);
    });

    it("should preserve mention node when patching adjacent text in the same paragraph", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const mentionId = randomUUID();

      // Paragraph: "Hello " + @mention + " please review this"
      document.content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello " },
              {
                type: "mention",
                attrs: {
                  type: "user",
                  label: "Tom",
                  modelId: mentionId,
                  actorId: null,
                  id: mentionId,
                },
              },
              { type: "text", text: " please review this" },
            ],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const mentionNode = beforeDoc.content[0].content[1];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "please approve this",
        TextEditMode.Patch,
        "please review this"
      );
      const content = result.content!.content!;

      expect(content).toHaveLength(1);
      expect(content[0].type).toEqual("paragraph");
      // The mention node must be preserved
      expect(content[0].content![1]).toEqual(mentionNode);
    });

    it("should preserve table colwidth when patching a different cell", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });

      // Table with colwidth set on cells (not representable in markdown)
      document.content = {
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "tr",
                content: [
                  {
                    type: "th",
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      colwidth: [150],
                      alignment: null,
                    },
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Header A" }],
                      },
                    ],
                  },
                  {
                    type: "th",
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      colwidth: [250],
                      alignment: null,
                    },
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Header B" }],
                      },
                    ],
                  },
                ],
              },
              {
                type: "tr",
                content: [
                  {
                    type: "td",
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      colwidth: [150],
                      alignment: null,
                    },
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Cell to edit" }],
                      },
                    ],
                  },
                  {
                    type: "td",
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      colwidth: [250],
                      alignment: null,
                    },
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "Keep this" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      // Second cell in second row should retain colwidth
      const unchangedCell = beforeDoc.content[0].content[1].content[1];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Updated cell",
        TextEditMode.Patch,
        "Cell to edit"
      );
      const table = result.content!.content![0];
      const secondRow = table.content![1];

      // The unchanged cell must preserve its colwidth attr
      expect(secondRow.content![1]).toEqual(unchangedCell);
      expect(secondRow.content![1].attrs!.colwidth).toEqual([250]);
    });

    it("should preserve trailing whitespace in checklist items when patching", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });

      // Checklist where an item ends with a hard break (trailing spaces matter)
      document.content = {
        type: "doc",
        content: [
          {
            type: "checkbox_list",
            content: [
              {
                type: "checkbox_item",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Edit me" }],
                  },
                ],
              },
              {
                type: "checkbox_item",
                attrs: { checked: false },
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Line one" },
                      { type: "br" },
                      { type: "text", text: "Line two" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const secondItem = beforeDoc.content[0].content[1];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Edited",
        TextEditMode.Patch,
        "Edit me"
      );
      const list = result.content!.content![0];

      // The second item with its hard break must be preserved exactly
      expect(list.content![1]).toEqual(secondItem);
    });

    it("should preserve rich content in blockquote when patching", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });
      const commentId = randomUUID();

      // Blockquote with two paragraphs; second has a comment mark
      document.content = {
        type: "doc",
        content: [
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Edit this line" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "comment",
                        attrs: { id: commentId, userId: commentId },
                      },
                    ],
                    text: "Keep this comment",
                  },
                ],
              },
            ],
          },
        ],
      };
      await document.save();

      const beforeDoc = DocumentHelper.toProsemirror(document).toJSON();
      const secondPara = beforeDoc.content[0].content[1];

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Edited line",
        TextEditMode.Patch,
        "Edit this line"
      );
      const blockquote = result.content!.content![0];

      // Patched paragraph updated
      expect(blockquote.content![0].content![0].text).toEqual("Edited line");

      // Second paragraph with comment mark preserved exactly
      expect(blockquote.content![1]).toEqual(secondPara);
    });

    it("should always patch the first occurrence when findText appears multiple times", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "TODO item\n\nSome details\n\nTODO item",
      });

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "DONE item",
        TextEditMode.Patch,
        "TODO item"
      );
      const content = result.content!.content!;

      expect(content).toHaveLength(3);
      // First occurrence replaced
      expect(content[0]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "DONE item" }],
      });
      // Middle paragraph unchanged
      expect(content[1]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "Some details" }],
      });
      // Second occurrence untouched
      expect(content[2]).toMatchObject({
        type: "paragraph",
        content: [{ type: "text", text: "TODO item" }],
      });
    });

    it("should patch text containing inline formatting", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
        text: "This is **bold** text",
      });

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "This is **strong** text",
        TextEditMode.Patch,
        "This is **bold** text"
      );
      const content = result.content!.content!;

      expect(content).toHaveLength(1);
      expect(content[0]).toMatchObject({
        type: "paragraph",
        content: [
          { type: "text", text: "This is " },
          {
            type: "text",
            marks: [{ type: "strong" }],
            text: "strong",
          },
          { type: "text", text: " text" },
        ],
      });
    });

    it("should preserve ordered list container attrs when patching an item", async () => {
      const user = await buildUser();
      let document = await buildDocument({
        teamId: user.teamId,
      });

      // Ordered list starting at 3 with lower-alpha style
      document.content = {
        type: "doc",
        content: [
          {
            type: "ordered_list",
            attrs: { order: 3, listStyle: "lower-alpha" },
            content: [
              {
                type: "list_item",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "First item" }],
                  },
                ],
              },
              {
                type: "list_item",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Second item" }],
                  },
                ],
              },
            ],
          },
        ],
      };
      await document.save();

      const result = DocumentHelper.applyMarkdownToDocument(
        document,
        "Updated item",
        TextEditMode.Patch,
        "First item"
      );
      const list = result.content!.content![0];

      // Container attrs must be preserved
      expect(list.attrs!.order).toEqual(3);
      expect(list.attrs!.listStyle).toEqual("lower-alpha");

      // Patched item updated
      expect(list.content![0].content![0].content![0].text).toEqual(
        "Updated item"
      );

      // Unchanged item preserved
      expect(list.content![1].content![0].content![0].text).toEqual(
        "Second item"
      );
    });
  });
});
