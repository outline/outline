import "./bootstrap";
import { Subscription, Document, Event } from "@server/models";

const limit = 100;
let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false) {
  const work = async (page: number) => {
    console.log(`Backfill subscription… page ${page}`);

    // Retrieve all documents within set limit.
    const documents = await Document.findAll({
      limit,
      offset: page * limit,
      order: [["createdAt", "DESC"]],
    });

    for (const document of documents) {
      try {
        const collaborators = document.collaboratorIds;

        for (const collaborator of collaborators) {
          const [
            collaboratorSubscription,
            created,
          ] = await Subscription.findOrCreate({
            where: {
              userId: collaborator,
              documentId: document.id,
              event: "documents.update",
            },
          });

          if (created) {
            await Event.findOrCreate({
              where: {
                name: "subscriptions.create",
                userId: collaborator,
                modelId: collaboratorSubscription.id,
                documentId: collaboratorSubscription.documentId,
                actorId: collaboratorSubscription.userId,
              },
            });
          }
        }
      } catch (err) {
        console.error(`Failed at ${document.id}:`, err);

        continue;
      }
    }
  };

  await work(page);

  if (exit) {
    console.log("Backfill complete");
    process.exit(0);
  }
}

if (process.env.NODE_ENV !== "test") {
  main(true);
}
