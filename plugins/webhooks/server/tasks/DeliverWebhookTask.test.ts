import fetchMock from "jest-fetch-mock";
import { v4 as uuidv4 } from "uuid";
import { WebhookDelivery } from "@server/models";
import {
  buildUser,
  buildWebhookDelivery,
  buildWebhookSubscription,
} from "@server/test/factories";
import { UserEvent } from "@server/types";
import DeliverWebhookTask from "./DeliverWebhookTask";

beforeEach(async () => {
  jest.resetAllMocks();
  fetchMock.resetMocks();
  fetchMock.doMock();
});

const ip = "127.0.0.1";

describe("DeliverWebhookTask", () => {
  test("should hit the subscription url and record a delivery", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new DeliverWebhookTask();

    fetchMock.mockResponse("SUCCESS", { status: 200 });

    const event: UserEvent = {
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };
    await processor.perform({
      subscriptionId: subscription.id,
      event,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.com",
      expect.anything()
    );
    const parsedBody = JSON.parse(
      fetchMock.mock.calls[0]![1]!.body!.toString()
    );
    expect(parsedBody.webhookSubscriptionId).toBe(subscription.id);
    expect(parsedBody.event).toBe("users.signin");
    expect(parsedBody.payload.id).toBe(signedInUser.id);
    expect(parsedBody.payload.model).toBeDefined();

    const deliveries = await WebhookDelivery.findAll({
      where: { webhookSubscriptionId: subscription.id },
    });
    expect(deliveries.length).toBe(1);

    const delivery = deliveries[0];
    expect(delivery.status).toBe("success");
    expect(delivery.statusCode).toBe(200);
    expect(delivery.responseBody).toEqual("SUCCESS");
  });

  test("should hit the subscription url with signature header", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
      secret: "secret",
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new DeliverWebhookTask();

    const event: UserEvent = {
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };
    await processor.perform({
      subscriptionId: subscription.id,
      event,
    });

    const headers = fetchMock.mock.calls[0]![1]!.headers! as Record<
      string,
      string
    >;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(headers["Outline-Signature"]).toMatch(/^t=[0-9]+,s=[a-z0-9]+$/);
  });

  test("should hit the subscription url when the eventing model doesn't exist", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    const deletedUserId = uuidv4();
    const signedInUser = await buildUser({ teamId: subscription.teamId });

    const task = new DeliverWebhookTask();
    const event: UserEvent = {
      name: "users.delete",
      userId: deletedUserId,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };

    await task.perform({
      event,
      subscriptionId: subscription.id,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.com",
      expect.anything()
    );
    const parsedBody = JSON.parse(
      fetchMock.mock.calls[0]![1]!.body!.toString()
    );
    expect(parsedBody.webhookSubscriptionId).toBe(subscription.id);
    expect(parsedBody.event).toBe("users.delete");
    expect(parsedBody.payload.id).toBe(deletedUserId);

    const deliveries = await WebhookDelivery.findAll({
      where: { webhookSubscriptionId: subscription.id },
    });
    expect(deliveries.length).toBe(1);

    const delivery = deliveries[0];
    expect(delivery.status).toBe("success");
    expect(delivery.statusCode).toBe(200);
    expect(delivery.responseBody).toBeDefined();
  });

  test("should mark delivery as failed if post fails", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });

    fetchMock.mockResponse("FAILED", { status: 500 });

    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const task = new DeliverWebhookTask();

    const event: UserEvent = {
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };

    await task.perform({
      event,
      subscriptionId: subscription.id,
    });

    await subscription.reload();

    expect(subscription.enabled).toBe(true);

    const deliveries = await WebhookDelivery.findAll({
      where: { webhookSubscriptionId: subscription.id },
    });
    expect(deliveries.length).toBe(1);

    const delivery = deliveries[0];
    expect(delivery.status).toBe("failed");
    expect(delivery.statusCode).toBe(500);
    expect(delivery.responseBody).toBeDefined();
    expect(delivery.responseBody).toEqual("FAILED");
  });

  test("should disable the subscription if past deliveries failed", async () => {
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

    fetchMock.mockResponse(JSON.stringify({ message: "Failure" }), {
      status: 500,
    });

    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const task = new DeliverWebhookTask();

    const event: UserEvent = {
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };

    await task.perform({
      event,
      subscriptionId: subscription.id,
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
    expect(delivery.responseBody).toEqual('{"message":"Failure"}');
  });
});
