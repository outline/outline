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
        documentId: document.id,
        event: "documents.update",
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.userId).toEqual(user.id);
    expect(body.data.documentId).toEqual(document.id);
  });

  it("should not create duplicate subscriptions", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    // First `subscriptions.create` request.
    await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // Second `subscriptions.create` request.
    await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // Third `subscriptions.create` request.
    await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // List subscriptions associated with
    // `document.id`
    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    // Database should only have 1 "enabled" subscription registered.
    expect(body.data.length).toEqual(1);
    expect(body.data[0].userId).toEqual(user.id);
    expect(body.data[0].documentId).toEqual(document.id);
  });

  it("should not create a subscription on invalid events", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        // Subscription on event
        // that cannot be subscribed to.
        event: "documents.publish",
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("validation_error");
    expect(body.message).toEqual(
      `documents.publish is not a valid subscription event for documents`
    );
  });
});

describe("#subscriptions.info", () => {
  it("should provide info to user about their subscription", async () => {
    const creator = await buildUser();

    const subscriber = await buildUser({ teamId: creator.teamId });

    // `creator` creates two documents
    const document0 = await buildDocument({
      userId: creator.id,
      teamId: creator.teamId,
    });

    const document1 = await buildDocument({
      userId: creator.id,
      teamId: creator.teamId,
    });

    // `subscriber` subscribes to `document0`.
    const subscription0 = await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document0.id,
        event: "documents.update",
      },
    });

    expect(subscription0.status).toEqual(200);

    const response0 = await subscription0.json();

    expect(response0.data.id).toBeDefined();
    expect(response0.data.userId).toEqual(subscriber.id);
    expect(response0.data.documentId).toEqual(document0.id);

    // `subscriber` subscribes to `document1`.
    const subscription1 = await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document1.id,
        event: "documents.update",
      },
    });

    expect(subscription1.status).toEqual(200);

    const response1 = await subscription1.json();

    expect(response1.data.id).toBeDefined();
    expect(response1.data.userId).toEqual(subscriber.id);
    expect(response1.data.documentId).toEqual(document1.id);

    // `subscriber` wants info about their subscriptions.
    const subscriptionInfo = await server.post("/api/subscriptions.info", {
      body: {
        token: subscriber.getJwtToken(),
      },
    });

    expect(subscriptionInfo.status).toEqual(200);

    const responseInfo = await subscriptionInfo.json();

    expect(responseInfo.data.length).toEqual(2);

    expect(responseInfo.data[0].id).toBeDefined();
    expect(responseInfo.data[0].userId).toEqual(subscriber.id);
    // `document1` subscription is latest.
    expect(responseInfo.data[0].documentId).toEqual(document1.id);

    expect(responseInfo.data[1].id).toBeDefined();
    expect(responseInfo.data[1].userId).toEqual(subscriber.id);
    expect(responseInfo.data[1].documentId).toEqual(document0.id);
  });

  it("should not allow outsiders to gain info about a subscription", async () => {
    const creator = await buildUser();

    const subscriber = await buildUser({ teamId: creator.teamId });

    // `viewer` is not a part of `creator`'s team.
    const viewer = await buildUser();

    // `creator` creates two documents
    const document0 = await buildDocument({
      userId: creator.id,
      teamId: creator.teamId,
    });

    const document1 = await buildDocument({
      userId: creator.id,
      teamId: creator.teamId,
    });

    // `subscriber` subscribes to `document0`.
    const subscription0 = await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document0.id,
        event: "documents.update",
      },
    });

    expect(subscription0.status).toEqual(200);

    // `viewer` wants info about `subscriber`'s
    // subscription on `document0`.
    const subscription0Info = await server.post("/api/subscriptions.info", {
      body: {
        token: viewer.getJwtToken(),
      },
    });

    expect(subscription0Info.status).toEqual(200);

    const response0Info = await subscription0Info.json();

    // `viewer` should be have no subscriptions.
    expect(response0Info.data.length).toEqual(0);

    // `subscriber` subscribes to `document1`.
    const subscription1 = await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document1.id,
        event: "documents.update",
      },
    });

    expect(subscription1.status).toEqual(200);

    // `subscriber` wants info about their subscriptions on `document1`.
    const subscription1Info = await server.post("/api/subscriptions.info", {
      body: {
        token: subscriber.getJwtToken(),
      },
    });

    expect(subscription1Info.status).toEqual(200);

    const response1Info = await subscription1Info.json();

    expect(response1Info.data.length).toEqual(2);

    expect(response1Info.data[0].id).toBeDefined();
    expect(response1Info.data[0].userId).toEqual(subscriber.id);
    // `document1` subscription is latest.
    expect(response1Info.data[0].documentId).toEqual(document1.id);

    expect(response1Info.data[1].id).toBeDefined();
    expect(response1Info.data[1].userId).toEqual(subscriber.id);
    expect(response1Info.data[1].documentId).toEqual(document0.id);
  });
});

describe("#subscriptions.list", () => {
  it("should list user subscriptions", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    await buildSubscription();

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
      event: "documents.update",
    });

    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(subscription.id);
    expect(body.data[0].userId).toEqual(user.id);
    expect(body.data[0].documentId).toEqual(document.id);
  });

  it("user should be able to list subscriptions on document", async () => {
    const subscriber0 = await buildUser();
    // `subscriber1` belongs to `subscriber0`'s team.
    const subscriber1 = await buildUser({ teamId: subscriber0.teamId });
    // `viewer` belongs to `subscriber0`'s team.
    const viewer = await buildUser({ teamId: subscriber0.teamId });

    // `subscriber0` created a document.
    const document = await buildDocument({
      userId: subscriber0.id,
      teamId: subscriber0.teamId,
    });

    // `subscriber0` wants to be notified about
    // changes on this document.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber0.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // `subscriber1` wants to be notified about
    // changes on this document.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber1.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // `viewer` just wants to know the subscribers
    // for this document.
    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: viewer.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    // `document` should have two subscribers.
    expect(body.data.length).toEqual(2);
    // `subscriber1` subscribed after `subscriber0`
    expect(body.data[0].userId).toEqual(subscriber1.id);
    // Both subscribers subscribed to same `document`.
    expect(body.data[0].documentId).toEqual(document.id);
    expect(body.data[1].userId).toEqual(subscriber0.id);
    expect(body.data[1].documentId).toEqual(document.id);
  });

  it("user should not be able to list invalid subscriptions", async () => {
    const subscriber0 = await buildUser();
    // `subscriber1` belongs to `subscriber0`'s team.
    const subscriber1 = await buildUser({ teamId: subscriber0.teamId });
    // `viewer` belongs to `subscriber0`'s team.
    const viewer = await buildUser({ teamId: subscriber0.teamId });

    // `subscriber0` created a document.
    const document = await buildDocument({
      userId: subscriber0.id,
      teamId: subscriber0.teamId,
    });

    // `subscriber0` wants to be notified about
    // changes on this document.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber0.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // `subscriber1` wants to be notified about
    // changes on this document.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber1.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // `viewer` just wants to know the subscribers
    // for this document.
    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: viewer.getJwtToken(),
        documentId: document.id,
        event: "changes.on.documents",
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("validation_error");
    expect(body.message).toEqual(
      `changes.on.documents is not a valid subscription event for documents`
    );
  });

  it("user outside of the team should not be able to list subscriptions on internal document", async () => {
    const subscriber0 = await buildUser();
    // `subscriber1` belongs to `subscriber0`'s team.
    const subscriber1 = await buildUser({ teamId: subscriber0.teamId });
    // `viewer` belongs to a different team.
    const viewer = await buildUser();

    // `subscriber0` created a document.
    const document = await buildDocument({
      userId: subscriber0.id,
      teamId: subscriber0.teamId,
    });

    // `subscriber0` wants to be notified about
    // changes on this document.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber0.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // `subscriber1` wants to be notified about
    // changes on this document.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber1.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // `viewer` wants to know the subscribers
    // for this internal document.
    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: viewer.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    const body = await res.json();

    // `viewer` should not be authorized
    // to view subscriptions on this document.
    expect(res.status).toEqual(403);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("authorization_error");
    expect(body.message).toEqual("Authorization error");
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
      event: "documents.update",
    });

    const res = await server.post("/api/subscriptions.update", {
      body: {
        id: subscription.id,
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
    expect(body.data.id).toEqual(subscription.id);
    expect(body.data.userId).toEqual(user.id);
    expect(body.data.documentId).toEqual(document.id);
  });

  it("users should not be able to update other's subscriptions on document", async () => {
    const subscriber0 = await buildUser();
    // `subscriber1` belongs to `subscriber0`'s team.
    const subscriber1 = await buildUser({ teamId: subscriber0.teamId });

    // `subscriber0` created a document.
    const document = await buildDocument({
      userId: subscriber0.id,
      teamId: subscriber0.teamId,
    });

    // `subscriber0` wants to be notified about
    // changes on this document.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber0.getJwtToken(),
        userId: subscriber0.id,
        documentId: document.id,
        event: "documents.update",
      },
    });

    // `subscriber1` wants to be notified about
    // changes on this document.
    const resp = await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber1.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    const subscription1 = await resp.json();
    const subscription1Id = subscription1.data.id;

    // `subscriber0` wants to change `subscriber1`'s
    // subscription for this document.
    const res = await server.post("/api/subscriptions.update", {
      body: {
        // subscription id of `subscriber1`
        id: subscription1Id,
        event: "documents.update",
        enabled: false,
        // REVIEW: Should it require `subscription.id`?
        // There can be only one subscription
        // for `userId` + `documentId`.
        // id: subscription.id,
        token: subscriber0.getJwtToken(),
      },
    });

    const body = await res.json();

    // `subscriber0` should be unauthorized.
    expect(res.status).toEqual(403);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("authorization_error");
    expect(body.message).toEqual("Authorization error");
  });
});

describe("#subscriptions.delete", () => {
  it("should delete user's subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
      event: "documents.update",
    });

    const res = await server.post("/api/subscriptions.delete", {
      body: {
        userId: user.id,
        id: subscription.id,
        // REVIEW: Should it require `subscription.id`?
        // There can be only one subscription
        // for `userId` + `documentId`.
        // id: subscription.id,
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.id).toEqual(subscription.id);
    expect(body.userId).toEqual(user.id);
  });

  it("users should not be able to delete other's subscriptions on document", async () => {
    const subscriber0 = await buildUser();
    // `subscriber1` belongs to `subscriber0`'s team.
    const subscriber1 = await buildUser({ teamId: subscriber0.teamId });

    // `subscriber0` created a document.
    const document = await buildDocument({
      userId: subscriber0.id,
      teamId: subscriber0.teamId,
    });

    // `subscriber0` wants to be notified about
    // changes on this document.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber0.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    // `subscriber1` wants to be notified about
    // changes on this document.
    const resp = await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber1.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    const subscription1 = await resp.json();
    const subscription1Id = subscription1.data.id;

    // `subscriber0` wants to change `subscriber1`'s
    // subscription for this document.
    const res = await server.post("/api/subscriptions.delete", {
      body: {
        // `subscriber0`
        userId: subscriber0.id,
        // subscription id of `subscriber1`
        id: subscription1Id,
        // REVIEW: Should it require `subscription.id`?
        // There can be only one subscription
        // for `userId` + `documentId`.
        // id: subscription.id,
        token: subscriber0.getJwtToken(),
      },
    });

    const body = await res.json();

    // `subscriber0` should be unauthorized.
    expect(res.status).toEqual(403);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("authorization_error");
    expect(body.message).toEqual("Authorization error");
  });
});
