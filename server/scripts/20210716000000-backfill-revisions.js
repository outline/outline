// @flow
import "./bootstrap";
import debug from "debug";
import { Revision, Document, Event } from "../models";

const log = debug("server");
let page = 0;
let limit = 100;

export default async function main(exit = false) {
  const work = async (page: number) => {
    log(`Backfill revision events… page ${page}`);

    const revisions = await Revision.findAll({
      limit,
      offset: page * limit,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Document,
          as: "document",
          required: true,
          paranoid: false,
        },
      ],
    });

    for (const revision of revisions) {
      try {
        await Event.findOrCreate({
          where: {
            name: "revisions.create",
            modelId: revision.id,
            documentId: revision.documentId,
            actorId: revision.userId,
            teamId: revision.document.teamId,
          },
        });
      } catch (err) {
        console.error(`Failed at ${revision.id}:`, err);
        continue;
      }
    }

    return revisions.length === limit ? work(page + 1) : undefined;
  };

  await work(page);

  if (exit) {
    log("Backfill complete");
    process.exit(0);
  }
}

// In the test suite we import the script rather than run via node CLI
if (process.env.NODE_ENV !== "test") {
  main(true);
}
