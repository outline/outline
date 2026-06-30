import { IntegrationService } from "@shared/types";
import type { Import, ImportTask } from "@server/models";
import MarkdownImportsProcessor from "@server/queues/processors/MarkdownImportsProcessor";
import ObsidianAPIImportTask from "../tasks/ObsidianAPIImportTask";

// Supertype of the base processor's generic so the overrides below remain
// valid (contravariant) overrides of MarkdownImportsProcessor's Markdown-typed
// methods while still being able to inspect the Obsidian service value.
type Service = IntegrationService.Markdown | IntegrationService.Obsidian;

/**
 * Processes Obsidian imports. Obsidian shares the Markdown zip pipeline, so
 * collection and document persistence is inherited from
 * {@link MarkdownImportsProcessor}; this subclass only claims the Obsidian
 * service and schedules the Obsidian task.
 */
export class ObsidianImportsProcessor extends MarkdownImportsProcessor {
  protected canProcess(importModel: Import<Service>): boolean {
    return importModel.service === IntegrationService.Obsidian;
  }

  protected async scheduleTask(importTask: ImportTask<Service>): Promise<void> {
    await new ObsidianAPIImportTask().schedule({ importTaskId: importTask.id });
  }
}
