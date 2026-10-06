import { FetchError } from "node-fetch";
import {
  http,
  HttpResponse,
  type DefaultBodyType,
  type StrictRequest,
} from "msw";
import { sequelize } from "@server/storage/database";
import { server } from "@server/test/msw";
import { DocumentTag, Tag, WebhookDelivery } from "@server/models";
import {
  buildDocument,
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

  test("should deliver document payloads without tags", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["documents.update"],
    });
    const user = await buildUser({ teamId: subscription.teamId });
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const tag = await Tag.create({ teamId: user.teamId, name: "hooked" });
    await DocumentTag.create({ tagId: tag.id, documentId: document.id });
    const captured = captureWebhook("http://example.com");

    const queries: string[] = [];
    const query = sequelize.query.bind(sequelize);
    const spy = vi
      .spyOn(sequelize, "query")
      .mockImplementation((sql, options) => {
        queries.push(typeof sql === "string" ? sql : sql.query);
        return query(sql, options);
      });
    try {
      await new DeliverWebhookTask().perform({
        subscriptionId: subscription.id,
        event: {
          name: "documents.update",
          documentId: document.id,
          collectionId: document.collectionId!,
          teamId: user.teamId,
          actorId: user.id,
          ip,
          createdAt: new Date().toISOString(),
          data: { done: true },
        },
      });
    } finally {
      spy.mockRestore();
    }

    expect(captured.length).toBe(1);
    const parsedBody = JSON.parse(captured[0].body);
    expect(parsedBody.payload.model.id).toBe(document.id);
    expect(parsedBody.payload.model).not.toHaveProperty("tags");
    expect(queries.filter((sql) => /document_tags/.test(sql))).toHaveLength(0);
  });

  test("should deliver tag events with the presented tag", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["tags"],
    });
    const user = await buildUser({ teamId: subscription.teamId });
    const tag = await Tag.create({ teamId: user.teamId, name: "webhooked" });
    const captured = captureWebhook("http://example.com");

    await new DeliverWebhookTask().perform({
      subscriptionId: subscription.id,
      event: {
        name: "tags.update",
        modelId: tag.id,
        teamId: user.teamId,
        actorId: user.id,
        ip,
      },
    });

    expect(captured.length).toBe(1);
    const parsedBody = JSON.parse(captured[0].body);
    expect(parsedBody.event).toBe("tags.update");
    expect(parsedBody.payload.id).toBe(tag.id);
    expect(parsedBody.payload.model).toMatchObject({
      id: tag.id,
      name: "webhooked",
    });
    expect(parsedBody.payload.model).not.toHaveProperty("documentCount");
    expect(parsedBody.payload.model).not.toHaveProperty("createdById");
  });

  test("should deliver tags.merge with the sourceId and the target tag", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["tags"],
    });
    const user = await buildUser({ teamId: subscription.teamId });
    const source = await Tag.create({ teamId: user.teamId, name: "old" });
    const target = await Tag.create({ teamId: user.teamId, name: "new" });
    const captured = captureWebhook("http://example.com");

    await new DeliverWebhookTask().perform({
      subscriptionId: subscription.id,
      event: {
        name: "tags.merge",
        modelId: target.id,
        teamId: user.teamId,
        actorId: user.id,
        ip,
        data: { sourceId: source.id, sourceName: source.name },
      },
    });

    expect(captured.length).toBe(1);
    const parsedBody = JSON.parse(captured[0].body);
    expect(parsedBody.event).toBe("tags.merge");
    expect(parsedBody.payload.id).toBe(target.id);
    expect(parsedBody.payload.sourceId).toBe(source.id);
    expect(parsedBody.payload.model).toMatchObject({
      id: target.id,
      name: "new",
    });
  });

  test("should deliver tags.delete with the deleted name and no model", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["tags.delete"],
    });
    const user = await buildUser({ teamId: subscription.teamId });
    const tagId = crypto.randomUUID();
    const captured = captureWebhook("http://example.com");

    await new DeliverWebhookTask().perform({
      subscriptionId: subscription.id,
      event: {
        name: "tags.delete",
        modelId: tagId,
        teamId: user.teamId,
        actorId: user.id,
        ip,
        data: { name: "removed" },
      },
    });

    expect(captured.length).toBe(1);
    const parsedBody = JSON.parse(captured[0].body);
    expect(parsedBody.payload).toEqual({
      id: tagId,
      model: null,
      name: "removed",
    });
  });

  test.each(["tags.add", "tags.remove"] as const)(
    "should deliver %s with the tag and document id",
    async (name) => {
      const subscription = await buildWebhookSubscription({
        url: "http://example.com",
        events: ["*"],
      });
      const user = await buildUser({ teamId: subscription.teamId });
      const document = await buildDocument({
        teamId: user.teamId,
        userId: user.id,
      });
      const tag = await Tag.create({ teamId: user.teamId, name: "linked" });
      const documentTag = await DocumentTag.create({
        tagId: tag.id,
        documentId: document.id,
      });
      const captured = captureWebhook("http://example.com");

      await new DeliverWebhookTask().perform({
        subscriptionId: subscription.id,
        event: {
          name,
          modelId: documentTag.id,
          documentId: document.id,
          teamId: user.teamId,
          actorId: user.id,
          ip,
          data: { tagId: tag.id },
        },
      });

      expect(captured.length).toBe(1);
      const parsedBody = JSON.parse(captured[0].body);
      expect(parsedBody.event).toBe(name);
      expect(parsedBody.payload.id).toBe(tag.id);
      expect(parsedBody.payload.documentId).toBe(document.id);
      expect(parsedBody.payload.model).toMatchObject({
        id: tag.id,
        name: "linked",
      });
    }
  );

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
