import JSZip from "jszip";
import { FileOperationFormat } from "@shared/types";
import { Collection } from "@server/models";
import ExportDocumentTreeTask from "./ExportDocumentTreeTask";

export default class ExportMarkdownZipTask extends ExportDocumentTreeTask {
  public async export(collections: Collection[]) {
    const zip = new JSZip();

    return await this.addCollectionsToArchive(
      zip,
      collections,
      FileOperationFormat.MarkdownZip
    );
  }
}
