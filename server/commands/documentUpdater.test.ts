import { sequelize } from "@server/database/sequelize";
import { Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import documentUpdater from "./documentUpdater";

beforeEach(() => flushdb());

describe("documentUpdater", () => {
  const ip = "127.0.0.1";

  it("should change lastModifiedById", async () => {
    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
    });

    document = await sequelize.transaction(async (transaction) =>
      documentUpdater({
        text: "Changed",
        document,
        user,
        ip,
        transaction,
      })
    );

    const event = await Event.findOne();
    expect(document.lastModifiedById).toEqual(user.id);
    expect(event!.name).toEqual("documents.update");
    expect(event!.documentId).toEqual(document.id);
  });

  it("should not change lastModifiedById or generate event if nothing changed", async () => {
    const user = await buildUser();
    let document = await buildDocument({
      teamId: user.teamId,
    });

    document = await sequelize.transaction(async (transaction) =>
      documentUpdater({
        title: document.title,
        document,
        user,
        ip,
        transaction,
      })
    );

    const event = await Event.findOne();
    expect(document.lastModifiedById).not.toEqual(user.id);
    expect(event).toEqual(null);
  });
});
