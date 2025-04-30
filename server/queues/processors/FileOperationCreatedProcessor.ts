import { FileOperationFormat, FileOperationType } from "@shared/types";
import { FileOperation } from "@server/models";
import { Event as TEvent, FileOperationEvent } from "@server/types";
import ExportHTMLZipTask from "../tasks/ExportHTMLZipTask";
import ExportJSONTask from "../tasks/ExportJSONTask";
import ExportMarkdownZipTask from "../tasks/ExportMarkdownZipTask";
import ImportJSONTask from "../tasks/ImportJSONTask";
import ImportMarkdownZipTask from "../tasks/ImportMarkdownZipTask";
import BaseProcessor from "./BaseProcessor";

export default class FileOperationCreatedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["fileOperations.create"];

  async perform(event: FileOperationEvent) {
    const fileOperation = await FileOperation.findByPk(event.modelId, {
      rejectOnEmpty: true,
    });

    // map file operation type and format to the appropriate task
    if (fileOperation.type === FileOperationType.Import) {
      switch (fileOperation.format) {
        case FileOperationFormat.MarkdownZip:
          await new ImportMarkdownZipTask().schedule({
            fileOperationId: event.modelId,
          });
          break;
        case FileOperationFormat.JSON:
          await new ImportJSONTask().schedule({
            fileOperationId: event.modelId,
          });
          break;
        default:
      }
    }

    if (fileOperation.type === FileOperationType.Export) {
      switch (fileOperation.format) {
        case FileOperationFormat.HTMLZip:
          await new ExportHTMLZipTask().schedule({
            fileOperationId: event.modelId,
          });
          break;
        case FileOperationFormat.MarkdownZip:
          await new ExportMarkdownZipTask().schedule({
            fileOperationId: event.modelId,
          });
          break;
        case FileOperationFormat.JSON:
          await new ExportJSONTask().schedule({
            fileOperationId: event.modelId,
          });
          break;
        default:
      }
    }
  }
}
