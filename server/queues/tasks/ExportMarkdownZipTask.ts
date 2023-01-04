import JSZip from "jszip";
import { FileOperationFormat } from "@shared/types";
import { Collection } from "@server/models";
import { addCollectionsToArchive } from "@server/utils/zip";
import ExportTask from "./ExportTask";

export default class ExportMarkdownZipTask extends ExportTask {
  public async export(collections: Collection[]) {
    const zip = new JSZip();

    return await addCollectionsToArchive(
      zip,
      collections,
      FileOperationFormat.MarkdownZip
    );
  }
}
