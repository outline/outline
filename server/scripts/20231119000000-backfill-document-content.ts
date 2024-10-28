import "./bootstrap";
import { Node } from "prosemirror-model";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import { ProsemirrorData } from "@shared/types";
import { parser, schema } from "@server/editor";
import { Document } from "@server/models";

const limit = 100;
const page = 0;

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill content… page ${page}`);

    // Retrieve all documents within set limit.
    const documents = await Document.unscoped().findAll({
      attributes: ["id", "urlId", "content", "text", "state"],
      limit,
      offset: page * limit,
      order: [["createdAt", "ASC"]],
      paranoid: false,
    });

    for (const document of documents) {
      if (document.content || !document.text) {
        continue;
      }

      console.log(`Writing content for ${document.id}`);

      if ("state" in document && document.state) {
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, document.state);
        document.content = yDocToProsemirrorJSON(
          ydoc,
          "default"
        ) as ProsemirrorData;
      } else {
        const node = parser.parse(document.text) || Node.fromJSON(schema, {});
        document.content = node.toJSON();
      }

      document.changed("content", true);

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
