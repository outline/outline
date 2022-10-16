import { Subscription } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import script from "./20220722000000-backfill-subscriptions";

setupTestDatabase();

describe("#work", () => {
  it("should create subscriptions and subscriptions for document creator and collaborators", async () => {
    const admin = await buildUser();

    // 5 collaborators that have cyclically contributed to documents.
    const collaborator0 = await buildUser({ teamId: admin.teamId });
    const collaborator1 = await buildUser({ teamId: admin.teamId });
    const collaborator2 = await buildUser({ teamId: admin.teamId });
    const collaborator3 = await buildUser({ teamId: admin.teamId });
    const collaborator4 = await buildUser({ teamId: admin.teamId });

    const document0 = await buildDocument({
      userId: collaborator0.id,
      collaboratorIds: [collaborator1.id, collaborator2.id],
    });

    const document1 = await buildDocument({
      userId: collaborator1.id,
      collaboratorIds: [collaborator2.id, collaborator3.id],
    });

    const document2 = await buildDocument({
      userId: collaborator2.id,
      collaboratorIds: [collaborator3.id, collaborator4.id],
    });

    const document3 = await buildDocument({
      userId: collaborator3.id,
      collaboratorIds: [collaborator4.id, collaborator0.id],
    });

    const document4 = await buildDocument({
      userId: collaborator4.id,
      collaboratorIds: [collaborator0.id, collaborator1.id],
    });

    await script();

    const subscriptions = await Subscription.findAll();

    subscriptions.forEach((subscription) => {
      expect(subscription.id).toBeDefined();
      expect(subscription.event).toEqual("documents.update");
    });

    // 5 documents, 3 collaborators each = 15.
    expect(subscriptions.length).toEqual(15);

    expect(subscriptions[0].documentId).toEqual(document0.id);
    expect(subscriptions[1].documentId).toEqual(document0.id);
    expect(subscriptions[2].documentId).toEqual(document0.id);

    const s0 = [
      subscriptions[0].userId,
      subscriptions[1].userId,
      subscriptions[2].userId,
    ];

    expect(s0.some((s) => s.includes(collaborator0.id))).toBe(true);
    expect(s0.some((s) => s.includes(collaborator1.id))).toBe(true);
    expect(s0.some((s) => s.includes(collaborator2.id))).toBe(true);

    expect(subscriptions[3].documentId).toEqual(document1.id);
    expect(subscriptions[4].documentId).toEqual(document1.id);
    expect(subscriptions[5].documentId).toEqual(document1.id);

    const s1 = [
      subscriptions[3].userId,
      subscriptions[4].userId,
      subscriptions[5].userId,
    ];

    expect(s1.some((s) => s.includes(collaborator1.id))).toBe(true);
    expect(s1.some((s) => s.includes(collaborator2.id))).toBe(true);
    expect(s1.some((s) => s.includes(collaborator3.id))).toBe(true);

    expect(subscriptions[6].documentId).toEqual(document2.id);
    expect(subscriptions[7].documentId).toEqual(document2.id);
    expect(subscriptions[8].documentId).toEqual(document2.id);

    const s2 = [
      subscriptions[6].userId,
      subscriptions[7].userId,
      subscriptions[8].userId,
    ];

    expect(s2.some((s) => s.includes(collaborator2.id))).toBe(true);
    expect(s2.some((s) => s.includes(collaborator3.id))).toBe(true);
    expect(s2.some((s) => s.includes(collaborator4.id))).toBe(true);

    expect(subscriptions[9].documentId).toEqual(document3.id);
    expect(subscriptions[10].documentId).toEqual(document3.id);
    expect(subscriptions[11].documentId).toEqual(document3.id);

    const s3 = [
      subscriptions[9].userId,
      subscriptions[10].userId,
      subscriptions[11].userId,
    ];

    expect(s3.some((s) => s.includes(collaborator0.id))).toBe(true);
    expect(s3.some((s) => s.includes(collaborator3.id))).toBe(true);
    expect(s3.some((s) => s.includes(collaborator4.id))).toBe(true);

    expect(subscriptions[12].documentId).toEqual(document4.id);
    expect(subscriptions[13].documentId).toEqual(document4.id);
    expect(subscriptions[14].documentId).toEqual(document4.id);

    const s4 = [
      subscriptions[12].userId,
      subscriptions[13].userId,
      subscriptions[14].userId,
    ];

    expect(s4.some((s) => s.includes(collaborator0.id))).toBe(true);
    expect(s4.some((s) => s.includes(collaborator1.id))).toBe(true);
    expect(s4.some((s) => s.includes(collaborator4.id))).toBe(true);
  });

  it("should not create subscriptions and subscriptions for non-collaborators", async () => {
    const admin = await buildUser();

    // 2 collaborators.
    const collaborator0 = await buildUser({ teamId: admin.teamId });
    const collaborator1 = await buildUser({ teamId: admin.teamId });

    // 1 viewer from the same team.
    const viewer = await buildUser({ teamId: admin.teamId });

    const document0 = await buildDocument({
      userId: collaborator0.id,
      collaboratorIds: [collaborator1.id],
    });

    await script();

    const subscriptions = await Subscription.findAll();

    subscriptions.forEach((subscription) => {
      expect(subscription.id).toBeDefined();
    });

    expect(
      subscriptions.filter((subscription) => subscription.userId === viewer.id)
        .length
    ).toEqual(0);

    expect(subscriptions[0].documentId).toEqual(document0.id);
    expect(subscriptions[1].documentId).toEqual(document0.id);
    expect(subscriptions.map((s) => s.userId)).toContain(collaborator1.id);
    expect(subscriptions.map((s) => s.userId)).toContain(collaborator0.id);
    expect(subscriptions[0].event).toEqual("documents.update");
    expect(subscriptions[1].event).toEqual("documents.update");
  });

  it("should be idempotent", async () => {
    await buildDocument();

    await script();
    await script();

    const count = await Subscription.count();

    expect(count).toEqual(1);
  });
});
