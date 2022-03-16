import { onChangePayload, onLoadDocumentPayload } from "@hocuspocus/server";
import invariant from "invariant";
import { debounce } from "lodash";
import * as Y from "yjs";
import Logger from "@server/logging/logger";
import Document from "@server/models/Document";
import documentUpdater from "../commands/documentUpdater";
import markdownToYDoc from "./utils/markdownToYDoc";

const DELAY = 3000;

export default class Persistence {
  async onLoadDocument({ documentName, ...data }: onLoadDocumentPayload) {
    const [, documentId] = documentName.split(".");
    const fieldName = "default";

    // Check if the given field already exists in the given y-doc. This is import
    // so we don't import a document fresh if it exists already.
    if (!data.document.isEmpty(fieldName)) {
      return;
    }

    const document = await Document.scope("withState").findOne({
      where: {
        id: documentId,
      },
    });
    invariant(document, "Document not found");

    if (document.state) {
      const ydoc = new Y.Doc();
      Logger.info("database", `Document ${documentId} is in database state`);
      Y.applyUpdate(ydoc, document.state);
      return ydoc;
    }

    Logger.info(
      "database",
      `Document ${documentId} is not in state, creating from markdown`
    );
    const ydoc = markdownToYDoc(document.text, fieldName);
    const state = Y.encodeStateAsUpdate(ydoc);
    await document.update(
      {
        state: Buffer.from(state),
      },
      {
        hooks: false,
      }
    );
    return ydoc;
  }

  onChange = debounce(
    async ({ document, context, documentName }: onChangePayload) => {
      const [, documentId] = documentName.split(".");
      Logger.info("database", `Persisting ${documentId}`);

      try {
        await documentUpdater({
          documentId,
          ydoc: document,
          userId: context.user?.id,
        });
      } catch (err) {
        Logger.error("Unable to persist document", err, {
          documentId,
          userId: context.user?.id,
        });
      }
    },
    DELAY,
    {
      maxWait: DELAY * 3,
    }
  );
}
