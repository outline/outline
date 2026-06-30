import type { IntegrationService } from "@shared/types";
import type { ImportTask } from "@server/models";
import MarkdownAPIImportTask from "@server/queues/tasks/MarkdownAPIImportTask";
import type { ZipTreeNode } from "@server/utils/ZipHelper";

// Supertype of the base task's generic so the `scheduleNextTask` override
// remains a valid override of MarkdownAPIImportTask's Markdown-typed method.
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

  /**
   * Slab exports wrap the entire workspace in a single root directory named
   * "slab". When present, descend into it so the directories one level down
   * are imported as collections rather than a single "slab" collection.
   *
   * @param nodes The archive's top-level tree nodes.
   * @returns The nodes to import as collections.
   */
  protected resolveCollectionRootNodes(nodes: ZipTreeNode[]): ZipTreeNode[] {
    if (
      nodes.length === 1 &&
      nodes[0].children.length > 0 &&
      nodes[0].title.toLowerCase() === "slab"
    ) {
      return nodes[0].children;
    }
    return nodes;
  }

  /**
   * Slab does not treat a document's first heading as its title — the
   * filename is authoritative. Keep the leading heading as body content.
   *
   * @returns false so the leading heading is preserved in the document body.
   */
  protected shouldExtractTitleFromHeading(): boolean {
    return false;
  }
}
