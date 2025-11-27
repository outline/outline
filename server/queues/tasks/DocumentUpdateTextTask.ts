import { franc } from "franc";
import { iso6393To1 } from "iso-639-3";
import { Node } from "prosemirror-model";
import { schema, serializer } from "@server/editor";
import { Document } from "@server/models";
import { DocumentEvent } from "@server/types";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { BaseTask } from "./base/BaseTask";

export default class DocumentUpdateTextTask extends BaseTask<DocumentEvent> {
  public async perform(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document?.content) {
      return;
    }

    const node = Node.fromJSON(schema, document.content);
    document.text = serializer.serialize(node);

    const language = franc(DocumentHelper.toPlainText(document), {
      minLength: 50,
    });
    document.language = iso6393To1[language];

    await document.save({ silent: true });
  }
}
