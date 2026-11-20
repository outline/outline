import type { onLoadDocumentPayload } from "@hocuspocus/server";
import * as Y from "yjs";
import { DocumentReset } from "@shared/collaboration/CloseEvents";
import { buildDocumentName } from "@shared/collaboration/documentName";
import { Document } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { buildDocument } from "@server/test/factories";
import PersistenceExtension from "./PersistenceExtension";

describe("PersistenceExtension", () => {
  describe("onLoadDocument", () => {
    const load = (documentName: string) =>
      new PersistenceExtension().onLoadDocument({
        documentName,
        document: { isEmpty: () => true },
        context: {},
      } as unknown as onLoadDocumentPayload & { context: object });

    const setGeneration = async (document: Document, stateGeneration: number) =>
      Document.unscoped().update(
        {
          stateGeneration,
          state: ProsemirrorHelper.flatten({
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
            ],
          }),
        },
        { where: { id: document.id }, hooks: false, silent: true }
      );

    it("loads the state of the current generation", async () => {
      const document = await buildDocument();
      await setGeneration(document, 1);

      const ydoc = await load(buildDocumentName(document.id, 1));

      expect(ydoc).toBeInstanceOf(Y.Doc);
      expect(ydoc?.get("default", Y.XmlFragment).toString()).toContain("Hello");
    });

    it("refuses to load state into a room of another generation", async () => {
      const document = await buildDocument();
      await setGeneration(document, 1);

      await expect(load(buildDocumentName(document.id, 0))).rejects.toBe(
        DocumentReset
      );
    });
  });
});
