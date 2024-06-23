import "./bootstrap";
import { Transaction } from "sequelize";
import parseTitle from "@shared/utils/parseTitle";
import { Revision } from "@server/models";
import { sequelize } from "@server/storage/database";

let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false, limit = 1000) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill revision emoji from title… page ${page}`);
    let revisions: Revision[] = [];
    await sequelize.transaction(async (transaction) => {
      revisions = await Revision.unscoped().findAll({
        attributes: ["id", "title", "emoji"],
        limit,
        offset: page * limit,
        order: [["createdAt", "ASC"]],
        paranoid: false,
        lock: Transaction.LOCK.UPDATE,
        transaction,
      });

      for (const revision of revisions) {
        try {
          const { emoji, strippedTitle } = parseTitle(revision.title);
          if (emoji) {
            revision.icon = emoji;
            revision.title = strippedTitle;

            if (revision.changed()) {
              console.log(`Migrating ${revision.id}…`);

              await revision.save({
                silent: true,
                transaction,
              });
            }
          }
        } catch (err) {
          console.error(`Failed at ${revision.id}:`, err);
          continue;
        }
      }
    });
    return revisions.length === limit ? work(page + 1) : undefined;
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
