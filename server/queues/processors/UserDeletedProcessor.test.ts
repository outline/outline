import UserAuthentication from "@server/models/UserAuthentication";
import { buildUser, buildWebhookSubscription } from "@server/test/factories";
import UserDeletedProcessor from "./UserDeletedProcessor";

const ip = "127.0.0.1";

describe("UserDeletedProcessor", () => {
  it("should remove relationships", async () => {
    const user = await buildUser();
    expect(
      await UserAuthentication.count({
        where: {
          userId: user.id,
        },
      })
    ).toBe(1);

    const processor = new UserDeletedProcessor();
    await processor.perform({
      name: "users.delete",
      userId: user.id,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    });

    expect(
      await UserAuthentication.count({
        where: {
          userId: user.id,
        },
      })
    ).toBe(0);
  });

  it("should disable webhook subscriptions created by the user", async () => {
    const user = await buildUser();
    const webhook = await buildWebhookSubscription({
      teamId: user.teamId,
      createdById: user.id,
    });

    const processor = new UserDeletedProcessor();
    await processor.perform({
      name: "users.delete",
      userId: user.id,
      actorId: user.id,
      teamId: user.teamId,
      ip,
    });

    await webhook.reload();
    expect(webhook.enabled).toEqual(false);
  });
});
