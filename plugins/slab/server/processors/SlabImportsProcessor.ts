import { IntegrationService } from "@shared/types";
import type { Import, ImportTask } from "@server/models";
import MarkdownImportsProcessor from "@server/queues/processors/MarkdownImportsProcessor";
import SlabAPIImportTask from "../tasks/SlabAPIImportTask";

// Supertype of the base processor's generic so the overrides below remain
// valid (contravariant) overrides of MarkdownImportsProcessor's Markdown-typed
// methods while still being able to inspect the Slab service value.
type Service = IntegrationService.Markdown | IntegrationService.Slab;

/**
 * Processes Slab imports. Slab shares the Markdown zip pipeline, so collection
 * and document persistence is inherited from {@link MarkdownImportsProcessor};
 * this subclass only claims the Slab service and schedules the Slab task.
 */
export class SlabImportsProcessor extends MarkdownImportsProcessor {
  protected canProcess(importModel: Import<Service>): boolean {
    return importModel.service === IntegrationService.Slab;
  }

  protected async scheduleTask(importTask: ImportTask<Service>): Promise<void> {
    await new SlabAPIImportTask().schedule({ importTaskId: importTask.id });
  }
}
