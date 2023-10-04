import { Event, Pin } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import pinDestroyer from "./pinDestroyer";

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

    const count = await Pin.count({
      where: {
        teamId: user.teamId,
      },
    });
    expect(count).toEqual(0);

    const event = await Event.findLatest({
      teamId: user.teamId,
    });
    expect(event!.name).toEqual("pins.delete");
    expect(event!.modelId).toEqual(pin.id);
  });
});
