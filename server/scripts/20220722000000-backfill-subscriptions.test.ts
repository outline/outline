import { buildDocument, buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import script from "./20220722000000-backfill-subscriptions";

beforeEach(() => flushdb());

describe("#work", () => {
  it("should create subscriptions and events for document creator and collaborators", async () => {
    const admin = await buildUser();

    // 5 collaborators that have cyclically contributed to documents.
    const collaborator0 = await buildUser({ teamId: admin.teamId });
    const collaborator1 = await buildUser({ teamId: admin.teamId });
    const collaborator2 = await buildUser({ teamId: admin.teamId });
    const collaborator3 = await buildUser({ teamId: admin.teamId });
    const collaborator4 = await buildUser({ teamId: admin.teamId });

    await buildDocument({
      userId: collaborator0.id,
      collaboratorIds: [collaborator1.id, collaborator2.id],
    });

    await buildDocument({
      userId: collaborator1.id,
      collaboratorIds: [collaborator2.id, collaborator3.id],
    });

    await buildDocument({
      userId: collaborator2.id,
      collaboratorIds: [collaborator3.id, collaborator4.id],
    });

    await buildDocument({
      userId: collaborator3.id,
      collaboratorIds: [collaborator4.id, collaborator0.id],
    });

    await buildDocument({
      userId: collaborator4.id,
      collaboratorIds: [collaborator0.id, collaborator1.id],
    });

    await script();

    // TODO: Check against.
    // Maybe expect(Subscription.findOrCreate).toHaveBeenCalledTimes(15);
  });

  it("should not create subscriptions and events for non-collaborators", async () => {
    const admin = await buildUser();

    // 2 collaborators.
    const collaborator0 = await buildUser({ teamId: admin.teamId });
    const collaborator1 = await buildUser({ teamId: admin.teamId });

    // 1 viewer from the same team.
    await buildUser({ teamId: admin.teamId });

    await buildDocument({
      userId: collaborator0.id,
      collaboratorIds: [collaborator1.id],
    });

    await script();

    // TODO: Check against.
    // Maybe expect(Subscription.findOrCreate).toHaveBeenCalled();
  });
});
