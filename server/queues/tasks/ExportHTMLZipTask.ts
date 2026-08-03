import type { NavigationNode } from "@shared/types";
import { FileOperationFormat } from "@shared/types";
import type { Collection, FileOperation } from "@server/models";
import type { Document } from "@server/models";
import ExportDocumentTreeTask from "./ExportDocumentTreeTask";

export default class ExportHTMLZipTask extends ExportDocumentTreeTask {
  public async exportCollections(
    collections: Collection[],
    fileOperation: FileOperation
  ) {
    return await this.addCollectionsToArchive(
      collections,
      FileOperationFormat.HTMLZip,
      fileOperation.options?.includeAttachments ?? true
    );
  }

  public async exportDocument(
    document: Document,
    documentStructure: NavigationNode[],
    includeAttachments: boolean
  ): Promise<string> {
    return await this.addDocumentToArchive({
      document,
      documentStructure,
      format: FileOperationFormat.HTMLZip,
      includeAttachments,
    });
  }
}
