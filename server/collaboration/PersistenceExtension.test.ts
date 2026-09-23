import type { onLoadDocumentPayload } from "@hocuspocus/server";
import { Node } from "prosemirror-model";
import { yDocToProsemirrorJSON } from "y-prosemirror";
import type * as Y from "yjs";
import { schema } from "@server/editor";
import Collection from "@server/models/Collection";
import { buildCollection, buildDocument } from "@server/test/factories";
import PersistenceExtension from "./PersistenceExtension";
import type { withContext } from "./types";

const extension = new PersistenceExtension();

const loadPayload = (documentName: string) =>
  ({
    documentName,
    document: {
      isEmpty: () => true,
    },
    context: {},
  }) as unknown as withContext<onLoadDocumentPayload>;

const toText = (ydoc?: Y.Doc) =>
  ydoc
    ? Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default")).textContent
    : undefined;

describe("PersistenceExtension", () => {
  describe("onLoadDocument", () => {
    it("should create collection state from existing content", async () => {
      const collection = await buildCollection({
        description: "Existing description",
      });

      const ydoc = await extension.onLoadDocument(
        loadPayload(`collection.${collection.id}`)
      );
      expect(toText(ydoc)).toEqual("Existing description");

      // the created state should be persisted for subsequent loads
      const updated = await Collection.findByPk(collection.id, {
        includeState: true,
        rejectOnEmpty: true,
      });
      expect(updated.state).toBeTruthy();
    });

    it("should load collection state once created", async () => {
      const collection = await buildCollection({
        description: "Existing description",
      });

      await extension.onLoadDocument(
        loadPayload(`collection.${collection.id}`)
      );
      const ydoc = await extension.onLoadDocument(
        loadPayload(`collection.${collection.id}`)
      );
      expect(toText(ydoc)).toEqual("Existing description");
    });

    it("should create document state from existing content", async () => {
      const document = await buildDocument({
        text: "Existing text",
      });

      const ydoc = await extension.onLoadDocument(
        loadPayload(`document.${document.id}`)
      );
      expect(toText(ydoc)).toEqual("Existing text");
    });
  });
});
