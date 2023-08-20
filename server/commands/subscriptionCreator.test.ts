import { Subscription, Event } from "@server/models";
import { sequelize } from "@server/storage/database";
import { buildDocument, buildUser } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import subscriptionCreator from "./subscriptionCreator";
import subscriptionDestroyer from "./subscriptionDestroyer";

setupTestDatabase();

describe("subscriptionCreator", () => {
  const ip = "127.0.0.1";
  const subscribedEvent = "documents.update";

  it("should create a subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    const event = await Event.findOne();

    expect(subscription.documentId).toEqual(document.id);
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
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
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
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    await sequelize.transaction(async (transaction) =>
      subscriptionDestroyer({
        user,
        subscription: subscription0,
        ip,
        transaction,
      })
    );

    expect(subscription0.id).toBeDefined();
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.deletedAt).toBeDefined();

    const subscription1 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    const events = await Event.count();

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
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    const subscription1 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    // Should emit 1 event instead of 2.
    const events = await Event.count();
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
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    await sequelize.transaction(async (transaction) =>
      subscriptionDestroyer({
        user,
        subscription: subscription0,
        ip,
        transaction,
      })
    );

    expect(subscription0.id).toBeDefined();
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.deletedAt).toBeDefined();

    const subscription1 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    // Should emit 3 events.
    // 2 create, 1 destroy.
    const events = await Event.findAll();
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
        user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    const events = await Event.count();
    expect(events).toEqual(1);

    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.deletedAt).toEqual(null);
  });
});
