import { Star, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import starUpdater from "./starUpdater";

setupTestDatabase();

describe("starUpdater", () => {
  const ip = "127.0.0.1";

  it("should update (move) existing star", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    let star = await Star.create({
      teamId: document.teamId,
      documentId: document.id,
      userId: user.id,
      createdById: user.id,
      index: "P",
    });

    star = await starUpdater({
      star,
      index: "h",
      user,
      ip,
    });

    const event = await Event.findOne();
    expect(star.documentId).toEqual(document.id);
    expect(star.userId).toEqual(user.id);
    expect(star.index).toEqual("h");
    expect(event!.name).toEqual("stars.update");
    expect(event!.modelId).toEqual(star.id);
  });
});
