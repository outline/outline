import { Event } from "@server/models";
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
        user,
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
        user,
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
        user,
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
