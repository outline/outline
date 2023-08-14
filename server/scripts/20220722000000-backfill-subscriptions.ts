import "./bootstrap";
import { Subscription, Document } from "@server/models";

const limit = 1000;
let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill subscription… page ${page}`);

    // Retrieve all documents within set limit.
    const documents = await Document.findAll({
      attributes: ["collaboratorIds", "id"],
      limit,
      offset: page * limit,
      order: [["createdAt", "ASC"]],
    });

    for (const document of documents) {
      try {
        await Promise.all(
          document.collaboratorIds.map((collaboratorId) =>
            Subscription.findOrCreate({
              where: {
                userId: collaboratorId,
                documentId: document.id,
                event: "documents.update",
              },
            })
          )
        );
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
}

if (process.env.NODE_ENV !== "test") {
  void main(true);
}
