import type { IntegrationService } from "@shared/types";
import type { ImportTask } from "@server/models";
import MarkdownAPIImportTask from "./MarkdownAPIImportTask";

// Supertype of the base task's generic so the `scheduleNextTask` override
// remains a valid override of MarkdownAPIImportTask's Markdown-typed method.
type Service = IntegrationService.Markdown | IntegrationService.OKF;

/**
 * Imports an Open Knowledge Format (OKF) bundle.
 *
 * An OKF bundle is a directory tree of Markdown documents with YAML
 * frontmatter, so all conversion (including frontmatter-based titles),
 * attachment, and persistence logic is inherited from
 * {@link MarkdownAPIImportTask}. This subclass exists so OKF imports are
 * scheduled, traced, and retried under their own task name rather than the
 * generic Markdown one.
 */
export default class OKFAPIImportTask extends MarkdownAPIImportTask {
  protected async scheduleNextTask(
    importTask: ImportTask<Service>
  ): Promise<void> {
    await new OKFAPIImportTask().schedule({ importTaskId: importTask.id });
  }
}
