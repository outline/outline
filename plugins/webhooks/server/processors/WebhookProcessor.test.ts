import { buildUser, buildWebhookSubscription } from "@server/test/factories";
import type { UserEvent } from "@server/types";
import DeliverWebhookTask from "../tasks/DeliverWebhookTask";
import WebhookProcessor from "./WebhookProcessor";

jest.mock("../tasks/DeliverWebhookTask");
const ip = "127.0.0.1";

beforeEach(() => {
  jest.resetAllMocks();
});

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
      data: {
        inviteAccepted: false,
        name: signedInUser.name,
        service: "google",
      },
    };

    await processor.perform(event);

    expect(DeliverWebhookTask.schedule).toHaveBeenCalled();
    expect(DeliverWebhookTask.schedule).toHaveBeenCalledWith({
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
      data: {
        inviteAccepted: false,
        name: signedInUser.name,
        service: "google",
      },
    };

    await processor.perform(event);

    expect(DeliverWebhookTask.schedule).toHaveBeenCalledTimes(0);
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
      data: {
        inviteAccepted: false,
        name: signedInUser.name,
        service: "google",
      },
    };

    await processor.perform(event);

    expect(DeliverWebhookTask.schedule).toHaveBeenCalled();
    expect(DeliverWebhookTask.schedule).toHaveBeenCalledTimes(2);
    expect(DeliverWebhookTask.schedule).toHaveBeenCalledWith({
      event,
      subscriptionId: subscription.id,
    });
    expect(DeliverWebhookTask.schedule).toHaveBeenCalledWith({
      event,
      subscriptionId: subscriptionTwo.id,
    });
  });
});
