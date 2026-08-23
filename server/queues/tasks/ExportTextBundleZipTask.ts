import type { NavigationNode } from "@shared/types";
import { FileOperationFormat } from "@shared/types";
import type { Collection, FileOperation } from "@server/models";
import type { Document } from "@server/models";
import ExportDocumentTreeTask from "./ExportDocumentTreeTask";

export default class ExportTextBundleZipTask extends ExportDocumentTreeTask {
  public async exportCollections(
    collections: Collection[],
    fileOperation: FileOperation
  ) {
    return await this.addCollectionsToArchive(
      collections,
      FileOperationFormat.TextBundleZip,
      fileOperation.options?.includeAttachments
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
      format: FileOperationFormat.TextBundleZip,
      includeAttachments,
    });
  }
}
