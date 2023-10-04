import { FileOperationFormat, FileOperationType } from "@shared/types";
import { FileOperation } from "@server/models";
import { Event as TEvent, FileOperationEvent } from "@server/types";
import ExportHTMLZipTask from "../tasks/ExportHTMLZipTask";
import ExportJSONTask from "../tasks/ExportJSONTask";
import ExportMarkdownZipTask from "../tasks/ExportMarkdownZipTask";
import ImportJSONTask from "../tasks/ImportJSONTask";
import ImportMarkdownZipTask from "../tasks/ImportMarkdownZipTask";
import ImportNotionTask from "../tasks/ImportNotionTask";
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
          await ImportMarkdownZipTask.schedule({
            fileOperationId: event.modelId,
          });
          break;
        case FileOperationFormat.Notion:
          await ImportNotionTask.schedule({
            fileOperationId: event.modelId,
          });
          break;
        case FileOperationFormat.JSON:
          await ImportJSONTask.schedule({
            fileOperationId: event.modelId,
          });
          break;
        default:
      }
    }

    if (fileOperation.type === FileOperationType.Export) {
      switch (fileOperation.format) {
        case FileOperationFormat.HTMLZip:
          await ExportHTMLZipTask.schedule({
            fileOperationId: event.modelId,
          });
          break;
        case FileOperationFormat.MarkdownZip:
          await ExportMarkdownZipTask.schedule({
            fileOperationId: event.modelId,
          });
          break;
        case FileOperationFormat.JSON:
          await ExportJSONTask.schedule({
            fileOperationId: event.modelId,
          });
          break;
        default:
      }
    }
  }
}
