import "./bootstrap";
import { Node } from "prosemirror-model";
import { parser, schema } from "@server/editor";
import { Revision } from "@server/models";

const limit = 100;
const page = 0;

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill content… page ${page}`);

    // Retrieve all revisions within set limit.
    const revisions = await Revision.unscoped().findAll({
      attributes: ["id", "content", "text"],
      limit,
      offset: page * limit,
      order: [["createdAt", "ASC"]],
      paranoid: false,
    });

    for (const revision of revisions) {
      if (revision.content || !revision.text) {
        continue;
      }

      console.log(`Writing content for ${revision.id}`);

      const node = parser.parse(revision.text) || Node.fromJSON(schema, {});
      revision.content = node.toJSON();
      revision.changed("content", true);

      await revision.save({
        hooks: false,
        silent: true,
      });
    }

    return revisions.length === limit ? work(page + 1) : undefined;
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
