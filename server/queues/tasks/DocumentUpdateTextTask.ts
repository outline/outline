import { Node } from "prosemirror-model";
import { schema, serializer } from "@server/editor";
import { Document } from "@server/models";
import { DocumentEvent } from "@server/types";
import BaseTask from "./BaseTask";

export default class DocumentUpdateTextTask extends BaseTask<DocumentEvent> {
  public async perform(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document?.content) {
      return;
    }

    const node = Node.fromJSON(schema, document.content);
    document.text = serializer.serialize(node);
    await document.save({ silent: true });
  }
}
