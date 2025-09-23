import "./bootstrap";
import { Transaction } from "sequelize";

import {
  OAuthClient,
  User,
  UserAuthentication,
  WebhookSubscription,
} from "@server/models";

import { sequelize } from "@server/storage/database";

export default async function main() {
  await sequelize.transaction(async (transaction) => {
    await UserAuthentication.destroy({
      where: {},
      transaction,
    });

    const webhooks = await WebhookSubscription.findAll({
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });

    for (const webhook of webhooks) {
      try {
        webhook.rotateSecret();
        await webhook.save({ transaction });
      } catch (err) {
        console.error(
          `Failed to rotate webhook signing secret for webhook ${webhook.id}:`,
          err
        );
        continue;
      }
    }

    const oauthClients = await OAuthClient.findAll({
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });

    for (const client of oauthClients) {
      try {
        client.rotateClientSecret();
        await client.save({ transaction });
      } catch (err) {
        console.error(
          `Failed to rotate OAuth client secret for client ${client.id}:`,
          err
        );
        continue;
      }
    }

    const users = await User.findAll({
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });

    for (const user of users) {
      try {
        await user.rotateJwtSecret({ transaction });
      } catch (err) {
        console.error(`Failed to rotate JWT secret for user ${user.id}:`, err);
        continue;
      }
    }

    console.log(`Reset encrypted data, logged out ${users.length} users`);
  });

  process.exit(0);
}

// In the test suite we import the script rather than run via node CLI
if (process.env.NODE_ENV !== "test") {
  void main();
}
