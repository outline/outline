import { IntegrationService } from "@shared/types";
import type { Import, ImportTask } from "@server/models";
import OKFAPIImportTask from "../tasks/OKFAPIImportTask";
import MarkdownImportsProcessor from "./MarkdownImportsProcessor";

// Supertype of the base processor's generic so the overrides below remain
// valid (contravariant) overrides of MarkdownImportsProcessor's Markdown-typed
// methods while still being able to inspect the OKF service value.
type Service = IntegrationService.Markdown | IntegrationService.OKF;

/**
 * Processes Open Knowledge Format (OKF) imports. OKF bundles share the
 * Markdown zip pipeline, so collection and document persistence is inherited
 * from {@link MarkdownImportsProcessor}; this subclass only claims the OKF
 * service and schedules the OKF task.
 */
export default class OKFImportsProcessor extends MarkdownImportsProcessor {
  protected canProcess(importModel: Import<Service>): boolean {
    return importModel.service === IntegrationService.OKF;
  }

  protected async scheduleTask(importTask: ImportTask<Service>): Promise<void> {
    await new OKFAPIImportTask().schedule({ importTaskId: importTask.id });
  }
}
