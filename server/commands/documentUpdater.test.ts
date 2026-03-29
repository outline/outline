import { randomUUID } from "node:crypto";
import * as Y from "yjs";
import { TextEditMode } from "@shared/types";
import { APIUpdateExtension } from "@server/collaboration/APIUpdateExtension";
import { Event } from "@server/models";
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

  it("should notify collaboration server when text changes", async () => {
    const notifyUpdateSpy = jest
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
    const notifyUpdateSpy = jest
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
});
