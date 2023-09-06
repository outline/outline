import { ApiKey } from "@server/models";
import {
  buildUser,
  buildApiKey,
  buildAdmin,
  buildWebhookSubscription,
  buildViewer,
} from "@server/test/factories";
import CleanupDemotedUserTask from "./CleanupDemotedUserTask";

describe("CleanupDemotedUserTask", () => {
  it("should delete api keys for suspended user", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({
      teamId: admin.teamId,
      suspendedAt: new Date(),
      suspendedById: admin.id,
    });
    const apiKey = await buildApiKey({
      userId: user.id,
    });

    const task = new CleanupDemotedUserTask();
    await task.perform({ userId: user.id });
    expect(await ApiKey.findByPk(apiKey.id)).toBeNull();
  });

  it("should delete api keys for viewer", async () => {
    const user = await buildViewer();
    const apiKey = await buildApiKey({
      userId: user.id,
    });

    const task = new CleanupDemotedUserTask();
    await task.perform({ userId: user.id });
    expect(await ApiKey.findByPk(apiKey.id)).toBeNull();
  });

  it("should retain api keys for member", async () => {
    const user = await buildUser();
    const apiKey = await buildApiKey({
      userId: user.id,
    });

    const task = new CleanupDemotedUserTask();
    await task.perform({ userId: user.id });
    expect(await ApiKey.findByPk(apiKey.id)).toBeTruthy();
  });

  it("should disable webhooks for suspended user", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({
      teamId: admin.teamId,
      suspendedAt: new Date(),
      suspendedById: admin.id,
    });
    const webhook = await buildWebhookSubscription({
      teamId: user.teamId,
      createdById: user.id,
    });

    const task = new CleanupDemotedUserTask();
    await task.perform({ userId: user.id });

    await webhook.reload();
    expect(webhook.enabled).toEqual(false);
  });

  it("should disable webhooks for member", async () => {
    const admin = await buildAdmin();
    const user = await buildUser({
      teamId: admin.teamId,
    });
    const webhook = await buildWebhookSubscription({
      teamId: user.teamId,
      createdById: user.id,
    });

    const task = new CleanupDemotedUserTask();
    await task.perform({ userId: user.id });

    await webhook.reload();
    expect(webhook.enabled).toEqual(false);
  });

  it("should retain webhooks for admin", async () => {
    const user = await buildAdmin();
    const webhook = await buildWebhookSubscription({
      teamId: user.teamId,
      createdById: user.id,
    });

    const task = new CleanupDemotedUserTask();
    await task.perform({ userId: user.id });

    await webhook.reload();
    expect(webhook.enabled).toEqual(true);
  });
});
