// @flow
import debug from "debug";
import { debounce } from "lodash";
import * as Y from "yjs";
import documentUpdater from "../commands/documentUpdater";
import { Document, User } from "../models";
import markdownToYDoc from "./utils/markdownToYDoc";

const log = debug("server");
const DELAY = 3000;

export default class Persistence {
  async onCreateDocument({
    documentName,
    ...data
  }: {
    documentName: string,
    document: Y.Doc,
  }) {
    const [, documentId] = documentName.split(".");
    const fieldName = "default";

    // Check if the given field already exists in the given y-doc.
    // Important: Only import a document if it doesn't exist in the primary data storage!
    if (!data.document.isEmpty(fieldName)) {
      return;
    }

    // Get the document from somewhere. In a real world application this would
    // probably be a database query or an API call
    const document = await Document.findByPk(documentId);

    if (document.state) {
      const ydoc = new Y.Doc();
      log(`Document ${documentId} is already in state`);
      Y.applyUpdate(ydoc, document.state);
      return ydoc;
    }

    log(`Document ${documentId} is not in state, creating state from markdown`);
    return markdownToYDoc(document.text, fieldName);
  }

  onChange = debounce(
    async ({
      document,
      context,
      documentName,
    }: {
      document: Y.Doc,
      context: { user: User },
      documentName: string,
    }) => {
      const [, documentId] = documentName.split(".");

      log(`persisting ${documentId}`);

      await documentUpdater({
        documentId,
        ydoc: document,
        userId: context.user?.id,
      });
    },
    DELAY,
    {
      maxWait: DELAY * 3,
    }
  );
}
