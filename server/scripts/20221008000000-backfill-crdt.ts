import "./bootstrap";
import { Node } from "prosemirror-model";
import { updateYFragment, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import { parser, schema, serializer } from "@server/editor";
import { Document } from "@server/models";

const limit = 100;
const page = 0;
const teamId = process.argv[2];

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill crdt… page ${page}`);

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
      },
      order: [["createdAt", "ASC"]],
      paranoid: false,
    });

    console.log(documents.length);

    for (const document of documents) {
      if (document.state || !document.text) {
        continue;
      }

      console.log(`Writing CRDT for ${document.id}`);

      const ydoc = new Y.Doc();
      const type = ydoc.get("default", Y.XmlFragment) as Y.XmlFragment;
      const doc = parser.parse(document.text);

      if (!type.doc) {
        throw new Error("type.doc not found");
      }

      // apply new document to existing ydoc
      updateYFragment(type.doc, type, doc, new Map());

      const state = Y.encodeStateAsUpdate(ydoc);
      document.state = Buffer.from(state);

      const node = Node.fromJSON(
        schema,
        yDocToProsemirrorJSON(ydoc, "default")
      );
      const text = serializer.serialize(node, undefined);
      document.text = text;

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
