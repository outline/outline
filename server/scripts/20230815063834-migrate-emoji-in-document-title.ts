import "./bootstrap";
import { Transaction } from "sequelize";
import parseTitle from "@shared/utils/parseTitle";
import { Document } from "@server/models";
import { sequelize } from "@server/storage/database";

let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false, limit = 100) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill document emoji from title… page ${page}`);
    let documents: Document[] = [];
    await sequelize.transaction(async (transaction) => {
      documents = await Document.unscoped().findAll({
        attributes: {
          exclude: ["state"],
        },
        limit,
        offset: page * limit,
        order: [["createdAt", "ASC"]],
        paranoid: false,
        lock: Transaction.LOCK.UPDATE,
        transaction,
      });

      for (const document of documents) {
        try {
          const { emoji, strippedTitle } = parseTitle(document.title);
          if (emoji) {
            document.emoji = emoji;
            document.title = strippedTitle;

            await document.save({
              silent: true,
              transaction,
            });
          }
        } catch (err) {
          console.error(`Failed at ${document.id}:`, err);
          continue;
        }
      }
    });
    return documents.length === limit ? work(page + 1) : undefined;
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
