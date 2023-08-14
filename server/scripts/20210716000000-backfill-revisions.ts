import "./bootstrap";
import { Revision, Document, Event } from "@server/models";

const limit = 100;
let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false) {
  // @ts-expect-error ts-migrate(7024) FIXME: Function implicitly has return type 'any' because ... Remove this comment to see the full error message
  const work = async (page: number) => {
    console.log(`Backfill revision events… page ${page}`);
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
          defaults: {
            createdAt: revision.createdAt,
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
    console.log("Backfill complete");
    process.exit(0);
  }
} // In the test suite we import the script rather than run via node CLI

if (process.env.NODE_ENV !== "test") {
  void main(true);
}
