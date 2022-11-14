import { Star, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import starDestroyer from "./starDestroyer";

setupTestDatabase();

describe("starDestroyer", () => {
  const ip = "127.0.0.1";

  it("should destroy existing star", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const star = await Star.create({
      teamId: document.teamId,
      documentId: document.id,
      userId: user.id,
      createdById: user.id,
      index: "P",
    });

    await starDestroyer({
      star,
      user,
      ip,
    });

    const count = await Star.count();
    expect(count).toEqual(0);

    const event = await Event.findOne();
    expect(event!.name).toEqual("stars.delete");
    expect(event!.modelId).toEqual(star.id);
  });
});
