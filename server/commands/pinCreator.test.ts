import { Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import pinCreator from "./pinCreator";

describe("pinCreator", () => {
  it("should create pin to home", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const pin = await withAPIContext(user, (ctx) =>
      pinCreator({
        ctx,
        user,
        documentId: document.id,
      })
    );

    const event = await Event.findLatest({
      teamId: user.teamId,
    });
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

    const pin = await withAPIContext(user, (ctx) =>
      pinCreator({
        ctx,
        user,
        documentId: document.id,
        collectionId: document.collectionId,
      })
    );

    const event = await Event.findLatest({
      teamId: user.teamId,
    });
    expect(pin.documentId).toEqual(document.id);
    expect(pin.collectionId).toEqual(document.collectionId);
    expect(pin.createdById).toEqual(user.id);
    expect(pin.index).toEqual("P");
    expect(event!.name).toEqual("pins.create");
    expect(event!.modelId).toEqual(pin.id);
    expect(event!.collectionId).toEqual(pin.collectionId);
  });
});
