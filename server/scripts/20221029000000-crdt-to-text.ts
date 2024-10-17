import "./bootstrap";
import { Node } from "prosemirror-model";
import { Op } from "sequelize";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import { schema, serializer } from "@server/editor";
import { Document } from "@server/models";

const limit = 100;
const page = 0;
const teamId = process.argv[2];

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill text from crdt… page ${page}`);

    if (!teamId && process.env.DEPLOYMENT === "hosted") {
      throw new Error("Team ID is required");
    }

    // Retrieve all documents within set limit.
    const documents = await Document.unscoped().findAll({
      attributes: ["id", "urlId", "text", "state"],
      limit,
      offset: page * limit,
      where: {
        ...(teamId ? { teamId } : {}),
        state: {
          [Op.ne]: null,
        },
      },
      order: [["createdAt", "ASC"]],
      paranoid: false,
    });

    console.log(documents.length);

    for (const document of documents) {
      const ydoc = new Y.Doc();
      // The where clause above ensures that state is non-null
      Y.applyUpdate(ydoc, document.state!);
      const node = Node.fromJSON(
        schema,
        yDocToProsemirrorJSON(ydoc, "default")
      );
      const text = serializer.serialize(node, undefined);

      if (text !== document.text) {
        console.log(`Writing text from CRDT for ${document.id}`);
        document.text = text;
      }

      await document.save({
        hooks: false,
        silent: true,
      });
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
