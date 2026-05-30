import { Node } from "prosemirror-model";
import { schema, serializer } from "@server/editor";
import { Document } from "@server/models";
import type { DocumentEvent } from "@server/types";
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

    // Loaded lazily to keep the language-detection corpus off the startup path —
    // only this worker task needs it.
    const [{ franc }, { iso6393To1 }] = await Promise.all([
      import("franc"),
      import("iso-639-3"),
    ]);

    const language = franc(DocumentHelper.toPlainText(document), {
      minLength: 50,
    });
    document.language = iso6393To1[language];

    await document.save({ silent: true });
  }
}
