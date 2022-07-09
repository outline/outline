import { ApiKey } from "@server/models";
import {
  buildUser,
  buildApiKey,
  buildAdmin,
  buildWebhookSubscription,
} from "@server/test/factories";
import { flushdb } from "@server/test/support";
import CleanupSuspendedUserTask from "./CleanupSuspendedUserTask";

beforeEach(() => flushdb());

describe("CleanupSuspendedUserTask", () => {
  it("should do nothing if user is no longer suspended", async () => {
    const user = await buildUser();
    const apiKey = await buildApiKey({
      userId: user.id,
    });

    const task = new CleanupSuspendedUserTask();
    await task.perform({ userId: user.id });
    expect(await ApiKey.findByPk(apiKey.id)).toBeTruthy();
  });

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

    const task = new CleanupSuspendedUserTask();
    await task.perform({ userId: user.id });
    expect(await ApiKey.findByPk(apiKey.id)).toBeNull();
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

    const task = new CleanupSuspendedUserTask();
    await task.perform({ userId: user.id });

    await webhook.reload();
    expect(webhook.enabled).toEqual(false);
  });
});
