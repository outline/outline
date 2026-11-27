import type { NavigationNode } from "@shared/types";
import { FileOperationFormat } from "@shared/types";
import type { Collection, FileOperation, User } from "@server/models";
import type { Document } from "@server/models";
import ExportDocumentTreeTask from "./ExportDocumentTreeTask";

export default class ExportMarkdownZipTask extends ExportDocumentTreeTask {
  public async exportCollections(
    collections: Collection[],
    fileOperation: FileOperation,
    user: User
  ) {
    return await this.addCollectionsToArchive(
      collections,
      user,
      FileOperationFormat.MarkdownZip,
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
      format: FileOperationFormat.MarkdownZip,
      includeAttachments,
    });
  }
}
