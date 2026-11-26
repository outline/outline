import { SubscriptionType } from "@shared/types";
import { Subscription } from "@server/models";
import { buildCollection, buildUser } from "@server/test/factories";
import CollectionSubscriptionAddOwnerTask from "./CollectionSubscriptionAddOwnerTask";

const ip = "127.0.0.1";

describe("CollectionSubscriptionAddOwnerTask", () => {
  const perform = (userId: string, collectionId: string, teamId: string) =>
    new CollectionSubscriptionAddOwnerTask().perform({
      name: "collections.add_owner",
      userId,
      modelId: collectionId,
      collectionId,
      teamId,
      actorId: userId,
      ip,
    });

  it("should subscribe an owner to the collection", async () => {
    const owner = await buildUser();
    const collection = await buildCollection({
      teamId: owner.teamId,
      ownerIds: [owner.id],
    });

    await perform(owner.id, collection.id, owner.teamId);

    const subscriptions = await Subscription.findAll({
      where: { userId: owner.id, collectionId: collection.id },
    });
    expect(subscriptions.map((subscription) => subscription.event)).toEqual([
      SubscriptionType.Document,
    ]);
  });

  it("should respect a previous unsubscribe", async () => {
    const owner = await buildUser();
    const collection = await buildCollection({
      teamId: owner.teamId,
      ownerIds: [owner.id],
    });
    const subscription = await Subscription.create({
      userId: owner.id,
      collectionId: collection.id,
      event: SubscriptionType.Document,
    });
    await subscription.destroy();

    await perform(owner.id, collection.id, owner.teamId);

    expect(
      await Subscription.count({
        where: { userId: owner.id, collectionId: collection.id },
      })
    ).toBe(0);
  });
});
