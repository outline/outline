import { SubscriptionType } from "@shared/types";
import { Event } from "@server/models";
import {
  buildUser,
  buildSubscription,
  buildDocument,
  buildCollection,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#subscriptions.create", () => {
  it("should create a document subscription for the whole collection", async () => {
    const user = await buildUser();

    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
        event: SubscriptionType.Document,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.userId).toEqual(user.id);
    expect(body.data.collectionId).toEqual(collection.id);
  });

  it("should create a document subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toBeDefined();
    expect(body.data.userId).toEqual(user.id);
    expect(body.data.documentId).toEqual(document.id);
  });

  it("should emit event", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.ok).toEqual(true);

    const events = await Event.findAll({
      where: {
        teamId: document.teamId,
      },
    });

    expect(events.length).toEqual(1);
    expect(events[0].name).toEqual("subscriptions.create");
    expect(events[0].actorId).toEqual(user.id);
    expect(events[0].documentId).toEqual(document.id);
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
        event: SubscriptionType.Document,
      },
    });

    // Second `subscriptions.create` request.
    await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });

    // Third `subscriptions.create` request.
    await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });

    // List subscriptions associated with `document.id`
    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: SubscriptionType.Document,
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
        // Subscription on event that cannot be subscribed to.
        event: "documents.publish",
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("validation_error");
    expect(body.message).toEqual(
      `event: Invalid literal value, expected "documents.update"`
    );
  });

  it("should throw 400 when neither documentId nor collectionId is provided", async () => {
    const user = await buildUser();

    const res = await server.post("/api/subscriptions.create", {
      body: {
        token: user.getJwtToken(),
        event: SubscriptionType.Document,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("validation_error");
    expect(body.message).toEqual(
      "body: one of collectionId or documentId is required"
    );
  });
});

describe("#subscriptions.info", () => {
  it("should provide info about a document subscription for the collection", async () => {
    const user = await buildUser();

    const subscriber = await buildUser({ teamId: user.teamId });

    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });

    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        collectionId: collection.id,
        event: SubscriptionType.Document,
      },
    });

    const res = await server.post("/api/subscriptions.info", {
      body: {
        token: subscriber.getJwtToken(),
        collectionId: collection.id,
        event: SubscriptionType.Document,
      },
    });
    const subscription = await res.json();

    expect(res.status).toEqual(200);
    expect(subscription.data.id).toBeDefined();
    expect(subscription.data.userId).toEqual(subscriber.id);
    expect(subscription.data.collectionId).toEqual(collection.id);
  });

  it("should provide info about a document subscription", async () => {
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
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document0.id,
        event: SubscriptionType.Document,
      },
    });

    // `subscriber` subscribes to `document1`.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document1.id,
        event: SubscriptionType.Document,
      },
    });

    // `subscriber` wants info about
    // their subscription on `document0`.
    const subscription0 = await server.post("/api/subscriptions.info", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document0.id,
        event: SubscriptionType.Document,
      },
    });

    const response0 = await subscription0.json();

    expect(subscription0.status).toEqual(200);
    expect(response0.data.id).toBeDefined();
    expect(response0.data.userId).toEqual(subscriber.id);
    expect(response0.data.documentId).toEqual(document0.id);
  });

  it("should throw 400 when neither documentId nor collectionId is provided", async () => {
    const user = await buildUser();

    const res = await server.post("/api/subscriptions.info", {
      body: {
        token: user.getJwtToken(),
        event: SubscriptionType.Document,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("validation_error");
    expect(body.message).toEqual(
      "body: one of collectionId or documentId is required"
    );
  });

  it("should throw 404 if no subscription found", async () => {
    const author = await buildUser();
    const subscriber = await buildUser({ teamId: author.teamId });
    const document = await buildDocument({
      userId: author.id,
      teamId: author.teamId,
    });

    const res = await server.post("/api/subscriptions.info", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document.id,
        event: SubscriptionType.Document,
      },
    });

    expect(res.status).toEqual(404);
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
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document0.id,
        event: SubscriptionType.Document,
      },
    });

    // `subscriber` subscribes to `document1`.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document1.id,
        event: SubscriptionType.Document,
      },
    });

    // `viewer` wants info about `subscriber`'s subscription on `document0`.
    const subscription0 = await server.post("/api/subscriptions.info", {
      body: {
        token: viewer.getJwtToken(),
        documentId: document0.id,
        event: SubscriptionType.Document,
      },
    });

    const response0 = await subscription0.json();

    // `viewer` should be unauthorized.
    expect(subscription0.status).toEqual(403);
    expect(response0.ok).toEqual(false);
    expect(response0.error).toEqual("authorization_error");
    expect(response0.message).toEqual("Authorization error");

    // `viewer` wants info about `subscriber`'s subscription on `document0`.
    const subscription1 = await server.post("/api/subscriptions.info", {
      body: {
        token: viewer.getJwtToken(),
        documentId: document1.id,
        event: SubscriptionType.Document,
      },
    });

    const response1 = await subscription1.json();

    // `viewer` should be unauthorized.
    expect(subscription1.status).toEqual(403);
    expect(response1.ok).toEqual(false);
    expect(response1.error).toEqual("authorization_error");
    expect(response1.message).toEqual("Authorization error");
  });

  it("should not provide infomation on invalid events", async () => {
    const creator = await buildUser();

    const subscriber = await buildUser({ teamId: creator.teamId });
    // `viewer` is a part of `creator`'s team.
    const viewer = await buildUser({ teamId: creator.teamId });

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
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document0.id,
        event: SubscriptionType.Document,
      },
    });

    // `subscriber` subscribes to `document1`.
    await server.post("/api/subscriptions.create", {
      body: {
        token: subscriber.getJwtToken(),
        documentId: document1.id,
        event: SubscriptionType.Document,
      },
    });

    // `viewer` wants info about `subscriber`'s subscription on `document0` - they have requested an invalid event.
    const subscription0 = await server.post("/api/subscriptions.info", {
      body: {
        token: viewer.getJwtToken(),
        documentId: document0.id,
        event: "documents.changed",
      },
    });

    const response0 = await subscription0.json();

    expect(subscription0.status).toEqual(400);
    expect(response0.ok).toEqual(false);
    expect(response0.error).toEqual("validation_error");
    expect(response0.message).toEqual(
      `event: Invalid literal value, expected "documents.update"`
    );

    // `viewer` wants info about `subscriber`'s
    // subscription on `document0`.
    // They have requested an invalid event.
    const subscription1 = await server.post("/api/subscriptions.info", {
      body: {
        token: viewer.getJwtToken(),
        documentId: document1.id,
        event: "doc.affected",
      },
    });

    const response1 = await subscription1.json();

    expect(subscription1.status).toEqual(400);
    expect(response1.ok).toEqual(false);
    expect(response1.error).toEqual("validation_error");
    expect(response1.message).toEqual(
      `event: Invalid literal value, expected "documents.update"`
    );
  });
});

describe("#subscriptions.list", () => {
  it("should list user subscriptions for the document", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: user.getJwtToken(),
        documentId: document.id,
        event: SubscriptionType.Document,
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
    // `viewer` doesn't have any subscriptions on `document`.
    expect(body.data.length).toEqual(0);

    // `subscriber0` wants to know the subscribers
    // for this document.
    const res0 = await server.post("/api/subscriptions.list", {
      body: {
        token: subscriber0.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    const body0 = await res0.json();

    // `subscriber1` subscribed after `subscriber0`
    expect(body0.data[0].userId).toEqual(subscriber0.id);
    // Both subscribers subscribed to same `document`.
    expect(body0.data[0].documentId).toEqual(document.id);

    // `subscriber1` wants to know the subscribers
    // for this document.
    const res1 = await server.post("/api/subscriptions.list", {
      body: {
        token: subscriber1.getJwtToken(),
        documentId: document.id,
        event: "documents.update",
      },
    });

    const body1 = await res1.json();

    // `subscriber1` subscribed after `subscriber1`
    expect(body1.data[0].userId).toEqual(subscriber1.id);
    // Both subscribers subscribed to same `document`.
    expect(body1.data[0].documentId).toEqual(document.id);
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
      `event: Invalid literal value, expected "documents.update"`
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
    const res = await server.post("/api/subscriptions.info", {
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

  it("should throw 400 when neither documentId nor collectionId is provided", async () => {
    const user = await buildUser();

    const res = await server.post("/api/subscriptions.list", {
      body: {
        token: user.getJwtToken(),
        event: SubscriptionType.Document,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body.ok).toEqual(false);
    expect(body.error).toEqual("validation_error");
    expect(body.message).toEqual(
      "body: one of collectionId or documentId is required"
    );
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
    });

    const res = await server.post("/api/subscriptions.delete", {
      body: {
        userId: user.id,
        id: subscription.id,
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.ok).toEqual(true);
    expect(body.success).toEqual(true);
  });

  it("should emit event", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
    });

    const res = await server.post("/api/subscriptions.delete", {
      body: {
        userId: user.id,
        id: subscription.id,
        token: user.getJwtToken(),
      },
    });

    const events = await Event.findAll({
      where: {
        teamId: document.teamId,
      },
    });

    expect(events.length).toEqual(1);
    expect(events[0].name).toEqual("subscriptions.delete");
    expect(events[0].modelId).toEqual(subscription.id);
    expect(events[0].actorId).toEqual(user.id);
    expect(events[0].documentId).toEqual(document.id);

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.ok).toEqual(true);
    expect(body.success).toEqual(true);
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
