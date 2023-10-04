import { Subscription } from "@server/models";
import { sequelize } from "@server/storage/database";
import {
  buildDocument,
  buildSubscription,
  buildUser,
} from "@server/test/factories";
import subscriptionDestroyer from "./subscriptionDestroyer";

describe("subscriptionDestroyer", () => {
  const ip = "127.0.0.1";

  it("should destroy existing subscription", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
    });

    await sequelize.transaction(
      async (transaction) =>
        await subscriptionDestroyer({
          user,
          subscription,
          ip,
          transaction,
        })
    );

    const count = await Subscription.count({
      where: {
        userId: user.id,
      },
    });

    expect(count).toEqual(0);
  });

  it("should soft delete row", async () => {
    const user = await buildUser();

    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const subscription = await buildSubscription({
      userId: user.id,
      documentId: document.id,
    });

    await sequelize.transaction(
      async (transaction) =>
        await subscriptionDestroyer({
          user,
          subscription,
          ip,
          transaction,
        })
    );

    const count = await Subscription.count({
      where: {
        userId: user.id,
      },
    });

    expect(count).toEqual(0);

    const deletedSubscription = await Subscription.findOne({
      where: {
        userId: user.id,
        documentId: document.id,
      },
      paranoid: false,
    });

    expect(deletedSubscription).toBeDefined();
    expect(deletedSubscription?.deletedAt).toBeDefined();
  });
});
