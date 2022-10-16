import { Pin, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import pinDestroyer from "./pinDestroyer";

setupTestDatabase();

describe("pinCreator", () => {
  const ip = "127.0.0.1";

  it("should destroy existing pin", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const pin = await Pin.create({
      teamId: document.teamId,
      documentId: document.id,
      collectionId: document.collectionId,
      createdById: user.id,
      index: "P",
    });

    await pinDestroyer({
      pin,
      user,
      ip,
    });

    const count = await Pin.count();
    expect(count).toEqual(0);

    const event = await Event.findOne();
    expect(event!.name).toEqual("pins.delete");
    expect(event!.modelId).toEqual(pin.id);
  });
});
