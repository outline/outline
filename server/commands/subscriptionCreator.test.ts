import { sequelize } from "@server/database/sequelize";
import { Subscription, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import subscriptionCreator from "./subscriptionCreator";

beforeEach(() => flushdb());

describe("subscriptionCreator", () => {
  const ip = "127.0.0.1";
  const subscribedEvent = "documents.update";

  it("should create subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user: user,
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
        user: user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );
    expect(subscription0.documentId).toEqual(document.id);
    expect(subscription0.userId).toEqual(user.id);
    expect(subscription1.documentId).toEqual(document.id);
    expect(subscription1.userId).toEqual(user.id);
    expect(subscription0.userId).toEqual(subscription1.userId);
    expect(subscription0.documentId).toEqual(subscription1.documentId);
  });

  it("should not enable subscription by overriding one that already exists in disabled state", async () => {
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
        user: user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    // Should not emit an event.
    const events = await Event.count();
    expect(events).toEqual(0);

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
        user: user,
        documentId: document.id,
        event: subscribedEvent,
        ip,
        transaction,
      })
    );

    const subscription1 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user: user,
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

  it("should fetch deletedAt column with paranoid option", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription0 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user: user,
        documentId: document.id,
        event: subscribedEvent,
        paranoid: true,
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
