import { Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import pinCreator from "./pinCreator";

setupTestDatabase();

describe("pinCreator", () => {
  const ip = "127.0.0.1";

  it("should create pin to home", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const pin = await pinCreator({
      documentId: document.id,
      user,
      ip,
    });

    const event = await Event.findOne();
    expect(pin.documentId).toEqual(document.id);
    expect(pin.collectionId).toEqual(null);
    expect(pin.createdById).toEqual(user.id);
    expect(pin.index).toEqual("P");
    expect(event!.name).toEqual("pins.create");
    expect(event!.modelId).toEqual(pin.id);
  });

  it("should create pin to collection", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const pin = await pinCreator({
      documentId: document.id,
      collectionId: document.collectionId,
      user,
      ip,
    });

    const event = await Event.findOne();
    expect(pin.documentId).toEqual(document.id);
    expect(pin.collectionId).toEqual(document.collectionId);
    expect(pin.createdById).toEqual(user.id);
    expect(pin.index).toEqual("P");
    expect(event!.name).toEqual("pins.create");
    expect(event!.modelId).toEqual(pin.id);
    expect(event!.collectionId).toEqual(pin.collectionId);
  });
});
