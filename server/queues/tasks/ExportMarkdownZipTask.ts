import JSZip from "jszip";
import { FileOperationFormat, NavigationNode } from "@shared/types";
import { Collection, Document, FileOperation } from "@server/models";
import ExportDocumentTreeTask from "./ExportDocumentTreeTask";

export default class ExportMarkdownZipTask extends ExportDocumentTreeTask {
  public async exportCollections(
    collections: Collection[],
    fileOperation: FileOperation
  ) {
    const zip = new JSZip();

    return await this.addCollectionsToArchive(
      zip,
      collections,
      FileOperationFormat.MarkdownZip,
      fileOperation.options?.includeAttachments
    );
  }

  public async exportDocument(
    document: Document,
    documentStructure: NavigationNode[]
  ): Promise<string> {
    const zip = new JSZip();

    return await this.addDocumentToArchive({
      document,
      documentStructure,
      format: FileOperationFormat.MarkdownZip,
      zip,
    });
  }
}
