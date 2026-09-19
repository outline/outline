import { FetchError } from "node-fetch";
import {
  http,
  HttpResponse,
  type DefaultBodyType,
  type StrictRequest,
} from "msw";
import { server } from "@server/test/msw";
import { WebhookDelivery } from "@server/models";
import {
  buildUser,
  buildWebhookDelivery,
  buildWebhookSubscription,
} from "@server/test/factories";
import type { UserEvent } from "@server/types";
import DeliverWebhookTask, {
  isExpectedNetworkError,
} from "./DeliverWebhookTask";

const ip = "127.0.0.1";

type CapturedRequest = {
  request: StrictRequest<DefaultBodyType>;
  body: string;
};

const captureWebhook = (
  url: string,
  response: () => Response = () => new HttpResponse(null, { status: 200 })
) => {
  const captured: CapturedRequest[] = [];
  server.use(
    http.post(url, async ({ request }) => {
      const cloned = request.clone();
      captured.push({ request, body: await cloned.text() });
      return response();
    })
  );
  return captured;
};

describe("DeliverWebhookTask", () => {
  test("should hit the subscription url and record a delivery", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new DeliverWebhookTask();

    const captured = captureWebhook(
      "http://example.com",
      () => new HttpResponse("SUCCESS", { status: 200 })
    );

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

    expect(captured.length).toBe(1);
    expect(captured[0].request.url).toBe("http://example.com/");
    const parsedBody = JSON.parse(captured[0].body);
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

    const captured = captureWebhook("http://example.com");

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

    expect(captured.length).toBe(1);
    expect(captured[0].request.headers.get("Outline-Signature")).toMatch(
      /^t=[0-9]+,s=[a-z0-9]+$/
    );
  });

  test("should hit the subscription url when the eventing model doesn't exist", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    const deletedUserId = crypto.randomUUID();
    const signedInUser = await buildUser({ teamId: subscription.teamId });

    const task = new DeliverWebhookTask();
    const event: UserEvent = {
      name: "users.delete",
      userId: deletedUserId,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };

    const captured = captureWebhook("http://example.com");

    await task.perform({
      event,
      subscriptionId: subscription.id,
    });

    expect(captured.length).toBe(1);
    expect(captured[0].request.url).toBe("http://example.com/");
    const parsedBody = JSON.parse(captured[0].body);
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

    captureWebhook(
      "http://example.com",
      () => new HttpResponse("FAILED", { status: 500 })
    );

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

    captureWebhook("http://example.com", () =>
      HttpResponse.json({ message: "Failure" }, { status: 500 })
    );

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

describe("isExpectedNetworkError", () => {
  test("treats node-fetch FetchError as expected", () => {
    expect(
      isExpectedNetworkError(
        new FetchError("request to https://example.com failed", "system")
      )
    ).toBe(true);
  });

  test("treats raw socket errors as expected", () => {
    expect(isExpectedNetworkError(new Error("socket hang up"))).toBe(true);
    expect(
      isExpectedNetworkError(
        Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" })
      )
    ).toBe(true);
  });

  test("treats connection error codes as expected", () => {
    for (const code of [
      "ECONNREFUSED",
      "ETIMEDOUT",
      "EHOSTUNREACH",
      "ENOTFOUND",
      "EAI_AGAIN",
    ]) {
      expect(
        isExpectedNetworkError(Object.assign(new Error("boom"), { code }))
      ).toBe(true);
    }
  });

  test("treats invalid certificate errors as expected", () => {
    expect(
      isExpectedNetworkError(
        Object.assign(new Error("self signed certificate"), {
          code: "DEPTH_ZERO_SELF_SIGNED_CERT",
        })
      )
    ).toBe(true);
  });

  test("treats the request timeout thrown by the fetch wrapper as expected", () => {
    expect(
      isExpectedNetworkError(new Error("Request timeout after 5000ms"))
    ).toBe(true);
  });

  test("does not treat unrelated errors as expected", () => {
    expect(
      isExpectedNetworkError(new TypeError("undefined is not a function"))
    ).toBe(false);
    expect(
      isExpectedNetworkError(new Error("Cannot read property foo of undefined"))
    ).toBe(false);
    expect(isExpectedNetworkError("socket hang up")).toBe(false);
    expect(isExpectedNetworkError(undefined)).toBe(false);
  });
});
