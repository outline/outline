import { Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import revisionCreator from "./revisionCreator";

beforeEach(() => flushdb());

describe("revisionCreator", () => {
  const ip = "127.0.0.1";

  it("should create revision model from document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const revision = await revisionCreator({
      document,
      user,
      ip,
    });
    const event = await Event.findOne();
    expect(revision.documentId).toEqual(document.id);
    expect(revision.userId).toEqual(user.id);
    expect(revision.createdAt).toEqual(document.updatedAt);
    expect(event!.name).toEqual("revisions.create");
    expect(event!.modelId).toEqual(revision.id);
    expect(event!.createdAt).toEqual(document.updatedAt);
  });
});
