import fetchMock from "jest-fetch-mock";
import { v4 as uuidv4 } from "uuid";
import { WebhookDelivery } from "@server/models";
import {
  buildUser,
  buildWebhookDelivery,
  buildWebhookSubscription,
} from "@server/test/factories";
import { flushdb } from "@server/test/support";
import WebhookProcessor from "./WebhookProcessor";

beforeEach(() => flushdb());
beforeEach(() => {
  jest.resetAllMocks();
  fetchMock.resetMocks();
});

const ip = "127.0.0.1";

fetchMock.enableMocks();

describe("WebhookProcessor", () => {
  test("should hit the subscription url and record a delivery", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new WebhookProcessor();
    await processor.perform({
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.com",
      expect.anything()
    );

    const deliveries = await WebhookDelivery.findAll({
      where: { webhookSubscriptionId: subscription.id },
    });
    expect(deliveries.length).toBe(1);

    const delivery = deliveries[0];
    expect(delivery.status).toBe("success");
    expect(delivery.statusCode).toBe(200);
    expect(delivery.responseBody).toBeDefined();
  });

  test("should hit the subscription url when the eventing model doesn't exist", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new WebhookProcessor();
    await processor.perform({
      name: "users.delete",
      userId: uuidv4(),
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.com",
      expect.anything()
    );

    const deliveries = await WebhookDelivery.findAll({
      where: { webhookSubscriptionId: subscription.id },
    });
    expect(deliveries.length).toBe(1);

    const delivery = deliveries[0];
    expect(delivery.status).toBe("success");
    expect(delivery.statusCode).toBe(200);
    expect(delivery.responseBody).toBeDefined();
  });

  test("should not hit the subscription url or records a delivery when not subscribed to event", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["users.create"],
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new WebhookProcessor();
    await processor.perform({
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    });

    expect(fetchMock).toHaveBeenCalledTimes(0);

    const deliveries = await WebhookDelivery.findAll({
      where: { webhookSubscriptionId: subscription.id },
    });
    expect(deliveries.length).toBe(0);
  });

  test("should disable the subscription is past deliveries failed", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    for (let i = 0; i < 25; i++) {
      await buildWebhookDelivery({
        webhookSubscriptionId: subscription.id,
        status: "failed",
      });
    }

    fetchMock.mockResponse("", { status: 500 });

    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new WebhookProcessor();

    await processor.perform({
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    });

    await subscription.reload();

    expect(subscription.enabled).toBe(false);

    const deliveries = await WebhookDelivery.findAll({
      where: { webhookSubscriptionId: subscription.id },
      order: [["createdAt", "DESC"]],
    });
    expect(deliveries.length).toBe(26);

    const delivery = deliveries[0];
    expect(delivery.status).toBe("failed");
    expect(delivery.statusCode).toBe(500);
    expect(delivery.responseBody).toBeDefined();
  });
});
