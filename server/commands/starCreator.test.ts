import { Star, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { withAPIContext } from "@server/test/support";
import starCreator from "./starCreator";

describe("starCreator", () => {
  it("should create star for document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const star = await withAPIContext(user, (ctx) =>
      starCreator({
        ctx,
        documentId: document.id,
        user,
      })
    );

    const event = await Event.findLatest({
      teamId: user.teamId,
    });
    expect(star.documentId).toEqual(document.id);
    expect(star.userId).toEqual(user.id);
    expect(star.index).toEqual("P");
    expect(event!.name).toEqual("stars.create");
    expect(event!.modelId).toEqual(star.id);
  });

  it("should not record event if star is existing", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    await Star.create({
      documentId: document.id,
      userId: user.id,
      index: "P",
    });

    const star = await withAPIContext(user, (ctx) =>
      starCreator({
        ctx,
        documentId: document.id,
        user,
      })
    );

    const events = await Event.count({
      where: {
        teamId: user.teamId,
      },
    });
    expect(star.documentId).toEqual(document.id);
    expect(star.userId).toEqual(user.id);
    expect(star.index).toEqual("P");
    expect(events).toEqual(0);
  });
});
