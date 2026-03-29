import "./bootstrap";
import * as readline from "node:readline";
import { Transaction } from "sequelize";

import {
  OAuthClient,
  User,
  UserAuthentication,
  WebhookSubscription,
} from "@server/models";

import { sequelize } from "@server/storage/database";

// Helper function to prompt user for input
function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// Helper function to pause and wait for user confirmation
async function waitForConfirmation(message: string): Promise<boolean> {
  const answer = await askQuestion(`${message} (y/N): `);
  return answer === "y" || answer === "yes";
}

export default async function main() {
  console.log("🔐 Reset Encrypted Data Script");
  console.log("This script will:");
  console.log("- Delete all user authentication tokens");
  console.log("- Rotate webhook signing secrets");
  console.log("- Rotate OAuth client secrets");
  console.log("- Rotate JWT secrets for all users (logging them out)");
  console.log("");

  const shouldContinue = await waitForConfirmation(
    "⚠️  This will log out all users and invalidate tokens. Continue?"
  );
  if (!shouldContinue) {
    console.log("❌ Operation cancelled.");
    process.exit(0);
  }

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
