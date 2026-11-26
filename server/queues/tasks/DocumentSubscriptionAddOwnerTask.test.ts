import { SubscriptionType } from "@shared/types";
import { Subscription } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import DocumentSubscriptionAddOwnerTask from "./DocumentSubscriptionAddOwnerTask";

const ip = "127.0.0.1";

describe("DocumentSubscriptionAddOwnerTask", () => {
  const perform = (userId: string, documentId: string, teamId: string) =>
    new DocumentSubscriptionAddOwnerTask().perform({
      name: "documents.add_owner",
      userId,
      modelId: documentId,
      documentId,
      teamId,
      actorId: userId,
      ip,
    });

  it("should subscribe an owner to the document", async () => {
    const owner = await buildUser();
    const document = await buildDocument({
      teamId: owner.teamId,
      userId: owner.id,
      ownerIds: [owner.id],
    });

    await perform(owner.id, document.id, owner.teamId);

    const subscription = await Subscription.findOne({
      where: {
        userId: owner.id,
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });
    expect(subscription).toBeTruthy();
  });

  it("should respect a previous unsubscribe", async () => {
    const owner = await buildUser();
    const document = await buildDocument({
      teamId: owner.teamId,
      userId: owner.id,
      ownerIds: [owner.id],
    });
    const subscription = await Subscription.create({
      userId: owner.id,
      documentId: document.id,
      event: SubscriptionType.Document,
    });
    await subscription.destroy();

    await perform(owner.id, document.id, owner.teamId);

    const reloaded = await Subscription.findByPk(subscription.id, {
      paranoid: false,
    });
    expect(reloaded?.deletedAt).toBeTruthy();
  });

  it("should not subscribe an owner that cannot read the document", async () => {
    const actor = await buildUser();
    const owner = await buildUser({ teamId: actor.teamId });
    const collection = await buildCollection({
      teamId: actor.teamId,
      userId: actor.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: actor.teamId,
      userId: actor.id,
      collectionId: collection.id,
      ownerIds: [owner.id],
    });

    await perform(owner.id, document.id, actor.teamId);

    expect(
      await Subscription.count({
        where: { userId: owner.id, documentId: document.id },
      })
    ).toEqual(0);
  });
});
