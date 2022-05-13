import invariant from "invariant";
import { FileOperation } from "@server/models";
import {
  FileOperationFormat,
  FileOperationType,
} from "@server/models/FileOperation";
import { Event as TEvent, FileOperationEvent } from "@server/types";
import ExportMarkdownZipTask from "../tasks/ExportMarkdownZipTask";
import ImportMarkdownZipTask from "../tasks/ImportMarkdownZipTask";
import ImportNotionTask from "../tasks/ImportNotionTask";
import BaseProcessor from "./BaseProcessor";

export default class FileOperationsProcessor extends BaseProcessor {
  static applicableEvents: TEvent["name"][] = ["fileOperations.create"];

  async perform(event: FileOperationEvent) {
    if (event.name !== "fileOperations.create") {
      return;
    }

    const fileOperation = await FileOperation.findByPk(event.modelId);
    invariant(fileOperation, "fileOperation not found");

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
        default:
      }
    }

    if (fileOperation.type === FileOperationType.Export) {
      switch (fileOperation.format) {
        case FileOperationFormat.MarkdownZip:
          await ExportMarkdownZipTask.schedule({
            fileOperationId: event.modelId,
          });
          break;
        default:
      }
    }
  }
}
