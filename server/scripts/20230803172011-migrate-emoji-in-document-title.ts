import "./bootstrap";
import parseTitle from "@shared/utils/parseTitle";
import { sequelize } from "@server/database/sequelize";
import { Document } from "@server/models";

const limit = 100;
let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill document emoji from title… page ${page}`);
    const documents = await Document.scope([
      "withoutState",
      "withDrafts",
    ]).findAll({
      limit,
      offset: page * limit,
      order: [["createdAt", "ASC"]],
      paranoid: false,
    });

    for (const document of documents) {
      try {
        const { emoji, strippedTitle } = parseTitle(document.title);
        if (emoji) {
          document.emoji = emoji;
          document.title = strippedTitle;
          await sequelize.transaction(async (transaction) =>
            document.save({
              silent: true,
              transaction,
            })
          );
        }
      } catch (err) {
        console.error(`Failed at ${document.id}:`, err);
        continue;
      }
    }

    return documents.length === limit ? work(page + 1) : undefined;
  };

  await work(page);

  if (exit) {
    console.log("Backfill complete");
    process.exit(0);
  }
} // In the test suite we import the script rather than run via node CLI

if (process.env.NODE_ENV !== "test") {
  void main(true);
}
