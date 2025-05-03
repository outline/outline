import "./bootstrap";
import { Transaction } from "sequelize";
import { ApiKey } from "@server/models";
import { sequelize } from "@server/storage/database";
import { hash } from "@server/utils/crypto";

let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false, limit = 100) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill apiKey hash… page ${page}`);
    let apiKeys: ApiKey[] = [];
    await sequelize.transaction(async (transaction) => {
      apiKeys = await ApiKey.unscoped().findAll({
        attributes: ["id", "secret", "value", "hash"],
        limit,
        offset: page * limit,
        order: [["createdAt", "ASC"]],
        lock: Transaction.LOCK.UPDATE,
        transaction,
      });

      for (const apiKey of apiKeys) {
        try {
          if (!apiKey.hash) {
            console.log(`Migrating ${apiKey.id}…`);
            apiKey.value = apiKey.secret;
            apiKey.hash = hash(apiKey.secret);
            // @ts-expect-error secret is deprecated
            apiKey.secret = null;
            await apiKey.save({ transaction });
          }
        } catch (err) {
          console.error(`Failed at ${apiKey.id}:`, err);
          continue;
        }
      }
    });
    return apiKeys.length === limit ? work(page + 1) : undefined;
  };

  await work(page);

  console.log("Backfill complete");

  if (exit) {
    process.exit(0);
  }
}

// In the test suite we import the script rather than run via node CLI
if (process.env.NODE_ENV !== "test") {
  void main(true);
}
