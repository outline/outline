import { Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import documentUpdater from "./documentUpdater";
import { randomUUID } from "crypto";

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
        append: true,
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
        append: true,
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
        append: true,
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
        append: true,
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
