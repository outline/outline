import type { IntegrationService } from "@shared/types";
import type { ImportTask } from "@server/models";
import MarkdownAPIImportTask from "./MarkdownAPIImportTask";

type Service = IntegrationService.Markdown | IntegrationService.Slab;

/**
 * Imports a Slab workspace export.
 *
 * Slab exports the same zip-of-Markdown structure as Outline's own Markdown
 * export, so all conversion, attachment, and persistence logic is inherited
 * from {@link MarkdownAPIImportTask}. This subclass exists as a dedicated
 * seam for Slab-specific behavior (e.g. quirks in how Slab references remote
 * assets) and so Slab imports are scheduled, traced, and retried under their
 * own task name rather than the generic Markdown one.
 */
export default class SlabAPIImportTask extends MarkdownAPIImportTask {
  protected async scheduleNextTask(
    importTask: ImportTask<Service>
  ): Promise<void> {
    await new SlabAPIImportTask().schedule({ importTaskId: importTask.id });
  }
}
