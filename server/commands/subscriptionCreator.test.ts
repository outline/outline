import { sequelize } from "@server/database/sequelize";
import { Subscription, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import subscriptionCreator from "./subscriptionCreator";

beforeEach(() => flushdb());

describe("subscriptionCreator", () => {
  const ip = "127.0.0.1";
  const enabled = true;

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
        enabled,
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

  it("should not create anther subscription if one already exists", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription1 = await Subscription.create({
      userId: user.id,
      documentId: document.id,
      enabled,
    });

    const subscription2 = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user: user,
        documentId: document.id,
        enabled,
        ip,
        transaction,
      })
    );

    expect(subscription1.userId).toEqual(subscription2.userId);
    expect(subscription1.documentId).toEqual(subscription2.documentId);
    expect(subscription1.enabled).toEqual(subscription2.enabled);
  });

  it("should not record event if the subscription already exists", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    await Subscription.create({
      userId: user.id,
      documentId: document.id,
      enabled,
    });

    const subscription = await sequelize.transaction(async (transaction) =>
      subscriptionCreator({
        user: user,
        documentId: document.id,
        enabled,
        ip,
        transaction,
      })
    );

    const events = await Event.count();
    expect(subscription.documentId).toEqual(document.id);
    expect(subscription.userId).toEqual(user.id);
    expect(events).toEqual(0);
  });
});
