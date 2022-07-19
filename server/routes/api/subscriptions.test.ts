import TestServer from "fetch-test-server";
import webService from "@server/services/web";
import {
  buildUser,
  buildSubscription,
  buildDocument,
} from "@server/test/factories";
import { flushdb } from "@server/test/support";

const app = webService();

const server = new TestServer(app.callback());

beforeEach(() => flushdb());

afterAll(() => server.close());

describe("#subscriptions.create", () => {
  it("should create a subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        userId: user.id,
        documentId: document.id,
        enabled: true,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.subscriptions.id).toBeDefined();
    expect(body.subscriptions.userId).toEqual(user.id);
    expect(body.subscriptions.documentId).toEqual(document.id);
    expect(body.subscriptions.enabled).toEqual(true);
  });
});

describe("#subscriptions.list", () => {
  it("should list users subscriptions", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    await buildSubscription();

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
      enabled: true,
    });

    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.subscriptions.length).toEqual(1);
    expect(body.subscriptions[0].id).toEqual(subscription.id);
    expect(body.subscriptions[0].userId).toEqual(user.id);
    expect(body.subscriptions[0].documentId).toEqual(document.id);
    expect(body.subscriptions[0].enabled).toEqual(true);
  });
});

describe("#subscriptions.update", () => {
  it("should update user's subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
      enabled: true,
    });

    const res = await server.post("/api/subscriptions.update", {
      body: {
        userId: user.id,
        subscriptionId: subscription.id,
        enabled: false,
        // REVIEW: Should it require `subscription.id`?
        // There can be only one subscription
        // for `userId` + `documentId`.
        // id: subscription.id,
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.subscriptions.id).toEqual(subscription.id);
    expect(body.subscriptions.userId).toEqual(user.id);
    expect(body.subscriptions.documentId).toEqual(document.id);
    expect(body.subscriptions.enabled).toEqual(false);
  });
});

describe("#subscriptions.delete", () => {
  it("should delete users subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
      enabled: true,
    });

    const res = await server.post("/api/subscriptions.delete", {
      body: {
        userId: user.id,
        subscriptionId: subscription.id,
        // REVIEW: Should it require `subscription.id`?
        // There can be only one subscription
        // for `userId` + `documentId`.
        // id: subscription.id,
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.subscriptionId).toEqual(subscription.id);
    expect(body.userId).toEqual(user.id);
  });
});
