// @flow
import debug from "debug";
import { debounce } from "lodash";
import { parser } from "rich-markdown-editor";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import documentUpdater from "../commands/documentUpdater";
import { Document, User } from "../models";

const log = debug("server");

export default class Persistence {
  delay: number;
  maxDelay: number;

  constructor({ delay, maxDelay }: { delay: number, maxDelay?: number }) {
    this.delay = delay;
    this.maxDelay = maxDelay || delay * 3;
  }

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
    const node = parser.parse(document.text);
    return prosemirrorToYDoc(node, fieldName);
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
    this.delay,
    {
      maxWait: this.maxDelay,
    }
  );
}
