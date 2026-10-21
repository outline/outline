import { serializer } from "@server/editor";
import { Document } from "@server/models";
import type { DocumentEvent } from "@server/types";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { iso6393To1 } from "@shared/utils/language";
import { BaseTask } from "./base/BaseTask";

export default class DocumentUpdateTextTask extends BaseTask<DocumentEvent> {
  public async perform(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document?.content) {
      return;
    }

    document.text = serializer.serialize(
      DocumentHelper.toProsemirror(document)
    );

    // Loaded lazily to keep the language-detection corpus off the startup path —
    // only this worker task needs it.
    const { franc } = await import("franc");

    const language = franc(DocumentHelper.toPlainText(document), {
      minLength: 50,
    });
    document.language = iso6393To1(language) ?? null;

    await document.save({ silent: true });
  }
}
