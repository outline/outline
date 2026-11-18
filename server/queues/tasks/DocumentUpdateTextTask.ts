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

    const text = serializer.serialize(DocumentHelper.toProsemirror(document));

    // Loaded lazily to keep the language-detection corpus off the startup path —
    // only this worker task needs it.
    const { franc } = await import("franc");

    const language = franc(DocumentHelper.toPlainText(document), {
      minLength: 50,
    });

    // Write only the derived columns so that concurrent collaborative saves are
    // not overwritten, the update hooks would also increment revisionCount.
    await Document.update(
      { text, language: iso6393To1(language) ?? null },
      { where: { id: document.id }, hooks: false, silent: true }
    );
  }
}
