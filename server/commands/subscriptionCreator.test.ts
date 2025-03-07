import { SubscriptionType } from "@shared/types";
import { createContext } from "@server/context";
import { Subscription, Event } from "@server/models";
import { sequelize } from "@server/storage/database";
import {
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import subscriptionCreator from "./subscriptionCreator";

describe("subscriptionCreator", () => {
  const ip = "127.0.0.1";
  const subscribedEvent = SubscriptionType.Document;

  it("should create a document subscription for the whole collection", async () => {
    const user = await buildUser();

    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        collectionId: collection.id,
        event: SubscriptionType.Document,
      })
    );

    const event = await Event.findOne({
      where: {
        teamId: user.teamId,
      },
    });

    expect(subscription.collectionId).toEqual(collection.id);
    expect(subscription.documentId).toBeNull();
    expect(subscription.userId).toEqual(user.id);
    expect(event?.name).toEqual("subscriptions.create");
    expect(event?.modelId).toEqual(subscription.id);
    expect(event?.actorId).toEqual(subscription.userId);
    expect(event?.userId).toEqual(subscription.userId);
    expect(event?.collectionId).toEqual(subscription.collectionId);
  });

  it("should create a document subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    const event = await Event.findOne({
      where: {
        teamId: user.teamId,
      },
    });

    expect(subscription.documentId).toEqual(document.id);
    expect(subscription.collectionId).toBeNull();
    expect(subscription.userId).toEqual(user.id);
    expect(event?.name).toEqual("subscriptions.create");
    expect(event?.modelId).toEqual(subscription.id);
    expect(event?.actorId).toEqual(subscription.userId);
    expect(event?.userId).toEqual(subscription.userId);
    expect(event?.documentId).toEqual(subscription.documentId);
  });

  it("should not create another subscription if one already exists", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription0 = await Subscription.create({
      userId: user.id,
      documentId: document.id,
      event: subscribedEvent,
    });

    const subscription1 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    expect(subscription0.event).toEqual(subscribedEvent);
    expect(subscription1.event).toEqual(subscribedEvent);

    expect(subscription0.userId).toEqual(user.id);
    expect(subscription1.userId).toEqual(user.id);

    // Primary concern
    expect(subscription0.id).toEqual(subscription1.id);

    // Edge cases
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription1.documentId).toEqual(document.id);

    expect(subscription0.userId).toEqual(subscription1.userId);
    expect(subscription0.documentId).toEqual(subscription1.documentId);
  });

  it("should enable subscription by overriding one that exists in disabled state", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription0 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    await sequelize.transaction(async (transaction) =>
      subscription0.destroyWithCtx(createContext({ user, transaction, ip }))
    );

    expect(subscription0.id).toBeDefined();
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.deletedAt).toBeDefined();

    const subscription1 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    const events = await Event.count({
      where: {
        teamId: user.teamId,
      },
    });

    // 3 events. 1 create, 1 destroy and 1 re-create.
    expect(events).toEqual(3);

    expect(subscription0.id).toEqual(subscription1.id);
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription1.documentId).toEqual(document.id);
    expect(subscription1.userId).toEqual(user.id);
    expect(subscription0.id).toEqual(subscription1.id);
    expect(subscription0.userId).toEqual(subscription1.userId);
    expect(subscription0.documentId).toEqual(subscription1.documentId);
  });

  it("should fetch already enabled subscription on create request", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription0 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    const subscription1 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    // Should emit 1 event instead of 2.
    const events = await Event.count({
      where: {
        teamId: user.teamId,
      },
    });
    expect(events).toEqual(1);

    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription1.documentId).toEqual(document.id);
    expect(subscription1.userId).toEqual(user.id);
    expect(subscription0.id).toEqual(subscription1.id);
    expect(subscription0.userId).toEqual(subscription1.userId);
    expect(subscription0.documentId).toEqual(subscription1.documentId);
  });

  it("should emit event when re-creating subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription0 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    await sequelize.transaction(async (transaction) =>
      subscription0.destroyWithCtx(createContext({ user, transaction, ip }))
    );

    expect(subscription0.id).toBeDefined();
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.deletedAt).toBeDefined();

    const subscription1 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    // Should emit 3 events.
    // 2 create, 1 destroy.
    const events = await Event.findAll({
      where: {
        teamId: user.teamId,
      },
      order: [["createdAt", "ASC"]],
    });
    expect(events.length).toEqual(3);

    expect(events[0].name).toEqual("subscriptions.create");
    expect(events[0].documentId).toEqual(document.id);
    expect(events[1].name).toEqual("subscriptions.delete");
    expect(events[1].documentId).toEqual(document.id);
    expect(events[2].name).toEqual("subscriptions.create");
    expect(events[2].documentId).toEqual(document.id);

    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription1.documentId).toEqual(document.id);
    expect(subscription1.userId).toEqual(user.id);
    expect(subscription0.id).toEqual(subscription1.id);
    expect(subscription0.userId).toEqual(subscription1.userId);
    expect(subscription0.documentId).toEqual(subscription1.documentId);
  });

  it("should fetch deletedAt column with paranoid option", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription0 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        ctx: createContext({ user, transaction, ip }),
        documentId: document.id,
        event: subscribedEvent,
      })
    );

    const events = await Event.count({
      where: {
        teamId: user.teamId,
      },
    });
    expect(events).toEqual(1);

    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.deletedAt).toEqual(null);
  });
});
