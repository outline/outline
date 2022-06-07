import fetchMock from "jest-fetch-mock";
import { WebhookDelivery } from "@server/models";
import { buildUser, buildWebhookSubscription } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import WebhookProcessor from "./WebhookProcessor";

beforeEach(() => flushdb());
beforeEach(() => {
  jest.resetAllMocks();
  (fetch as any).resetMocks();
});

const ip = "127.0.0.1";

fetchMock.enableMocks();

describe("WebhookProcessor", () => {
  test("hits the subscription url and records a delivery", async () => {
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

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("http://example.com", expect.anything());

    const deliveries = await WebhookDelivery.findAll({
      where: { webhookSubscriptionId: subscription.id },
    });
    expect(deliveries.length).toBe(1);

    const delivery = deliveries[0];
    expect(delivery.status).toBe("success");
    expect(delivery.statusCode).toBe(200);
    expect(delivery.responseBody).toBeDefined();
  });
});
