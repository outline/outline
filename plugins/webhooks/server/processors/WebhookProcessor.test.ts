import {
  buildAdmin,
  buildDocument,
  buildPersonalCollection,
  buildUser,
  buildWebhookSubscription,
} from "@server/test/factories";
import { mockTaskSchedule } from "@server/test/support";
import type { DocumentEvent, UserEvent } from "@server/types";
import WebhookProcessor from "./WebhookProcessor";

const ip = "127.0.0.1";
const schedule = mockTaskSchedule();

describe("WebhookProcessor", () => {
  it("it schedules a delivery for the event", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new WebhookProcessor();

    const event: UserEvent = {
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };

    await processor.perform(event);

    expect(schedule).toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledWith({
      event,
      subscriptionId: subscription.id,
    });
  });

  it("not schedule a delivery when not subscribed to event", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["users.create"],
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new WebhookProcessor();
    const event: UserEvent = {
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };

    await processor.perform(event);

    expect(schedule).toHaveBeenCalledTimes(0);
  });

  it("it schedules a delivery for the event for each subscription", async () => {
    const subscription = await buildWebhookSubscription({
      url: "http://example.com",
      events: ["*"],
    });
    const subscriptionTwo = await buildWebhookSubscription({
      url: "http://example.com",
      teamId: subscription.teamId,
      events: ["*"],
    });
    const signedInUser = await buildUser({ teamId: subscription.teamId });
    const processor = new WebhookProcessor();

    const event: UserEvent = {
      name: "users.signin",
      userId: signedInUser.id,
      teamId: subscription.teamId,
      actorId: signedInUser.id,
      ip,
    };

    await processor.perform(event);

    expect(schedule).toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledWith({
      event,
      subscriptionId: subscription.id,
    });
    expect(schedule).toHaveBeenCalledWith({
      event,
      subscriptionId: subscriptionTwo.id,
    });
  });

  describe("shouldQueue", () => {
    it("returns true when a matching subscription exists", async () => {
      const subscription = await buildWebhookSubscription({
        url: "http://example.com",
        events: ["users"],
      });
      const event: UserEvent = {
        name: "users.signin",
        userId: subscription.createdById,
        teamId: subscription.teamId,
        actorId: subscription.createdById,
        ip,
      };

      expect(await WebhookProcessor.shouldQueue(event)).toBe(true);
    });

    it("returns false when no subscription matches the event", async () => {
      const subscription = await buildWebhookSubscription({
        url: "http://example.com",
        events: ["documents.create"],
      });
      const event: UserEvent = {
        name: "users.signin",
        userId: subscription.createdById,
        teamId: subscription.teamId,
        actorId: subscription.createdById,
        ip,
      };

      expect(await WebhookProcessor.shouldQueue(event)).toBe(false);
    });

    it("returns false when the team has no subscriptions", async () => {
      const user = await buildUser();
      const event: UserEvent = {
        name: "users.signin",
        userId: user.id,
        teamId: user.teamId,
        actorId: user.id,
        ip,
      };

      expect(await WebhookProcessor.shouldQueue(event)).toBe(false);
    });
  });

  it("only schedules events in a personal collection for its owner", async () => {
    const owner = await buildUser();
    const admin = await buildAdmin({ teamId: owner.teamId });
    const personal = await buildPersonalCollection(owner);
    const document = await buildDocument({
      teamId: owner.teamId,
      userId: owner.id,
      collectionId: personal.id,
    });
    await buildWebhookSubscription({
      teamId: owner.teamId,
      createdById: admin.id,
      url: "http://example.com",
      events: ["*"],
    });
    const ownSubscription = await buildWebhookSubscription({
      teamId: owner.teamId,
      createdById: owner.id,
      url: "http://example.com",
      events: ["*"],
    });
    const processor = new WebhookProcessor();

    const event: DocumentEvent = {
      name: "documents.update",
      documentId: document.id,
      collectionId: personal.id,
      teamId: owner.teamId,
      actorId: owner.id,
      ip,
      createdAt: new Date().toISOString(),
      data: { done: true },
    };
    schedule.mockClear();
    await processor.perform(event);

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledWith({
      event,
      subscriptionId: ownSubscription.id,
    });
  });
});
