import JSZip from "jszip";
import { FileOperationFormat } from "@shared/types";
import { Collection, FileOperation } from "@server/models";
import ExportDocumentTreeTask from "./ExportDocumentTreeTask";

export default class ExportHTMLZipTask extends ExportDocumentTreeTask {
  public async export(collections: Collection[], fileOperation: FileOperation) {
    const zip = new JSZip();

    return await this.addCollectionsToArchive(
      zip,
      collections,
      FileOperationFormat.HTMLZip,
      fileOperation.options?.includeAttachments ?? true
    );
  }
}
