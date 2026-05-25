import { FileOperationFormat, FileOperationType } from "@shared/types";
import { FileOperation } from "@server/models";
import type { Event as TEvent, FileOperationEvent } from "@server/types";
import ExportHTMLZipTask from "../tasks/ExportHTMLZipTask";
import ExportJSONTask from "../tasks/ExportJSONTask";
import ExportMarkdownZipTask from "../tasks/ExportMarkdownZipTask";
import BaseProcessor from "./BaseProcessor";

export default class FileOperationCreatedProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["fileOperations.create"];

  async perform(event: FileOperationEvent) {
    const fileOperation = await FileOperation.unscoped().findByPk(
      event.modelId,
      {
        rejectOnEmpty: true,
      }
    );

    // Imports no longer flow through FileOperation — both JSON and Markdown
    // zip imports run through the API-import pipeline (`imports.create` →
    // {Markdown,JSON}APIImportTask). This dispatcher only handles exports.
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
