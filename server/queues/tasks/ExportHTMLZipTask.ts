import { FileOperationFormat } from "@shared/types";
import { Collection } from "@server/models";
import { archiveCollections } from "@server/utils/zip";
import ExportTask from "./ExportTask";

export default class ExportHTMLZipTask extends ExportTask {
  public async export(collections: Collection[]) {
    return await archiveCollections(collections, FileOperationFormat.HTMLZip);
  }
}
