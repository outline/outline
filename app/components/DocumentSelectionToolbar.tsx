import { observer } from "mobx-react";
import { ArchiveIcon, RestoreIcon, TrashIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useModelSelection } from "~/components/ModelSelectionContext";
import type { ModelSelectionAction } from "~/components/ModelSelectionToolbar";
import ModelSelectionToolbar from "~/components/ModelSelectionToolbar";
import type Document from "~/models/Document";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";

/**
 * Configures the generic selection toolbar with bulk actions for documents.
 * Each action reuses the per-document model operation, dispatching the whole
 * selection as a single request via the API client's batching.
 *
 * @returns the toolbar element, or null when no list selection is in scope.
 */
function DocumentSelectionToolbar() {
  const { t } = useTranslation();
  const { documents, policies } = useStores();
  const selection = useModelSelection();

  if (!selection) {
    return null;
  }

  const selectedDocuments = selection.selectedIds
    .map((id) => documents.get(id))
    .filter((document): document is Document => !!document);

  const every = (predicate: (abilities: Record<string, boolean>) => boolean) =>
    selectedDocuments.length > 0 &&
    selectedDocuments.every((document) =>
      predicate(policies.abilities(document.id))
    );

  const perform =
    (
      operation: (document: Document) => Promise<unknown>,
      message: (count: number) => string
    ) =>
    async () => {
      const targets = selectedDocuments;
      if (!targets.length) {
        return;
      }

      // Reuse the per-document operations, coalescing their requests into a
      // single batch dispatched once the synchronous map has fired them all.
      const results = await Promise.allSettled(
        client.batch(() => targets.map(operation))
      );
      selection.clear();

      const succeeded = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        toast.success(message(succeeded));
      }
      if (failed > 0) {
        toast.error(
          t("{{ count }} document could not be updated", { count: failed })
        );
      }
    };

  const actions: ModelSelectionAction[] = [
    {
      key: "archive",
      label: t("Archive"),
      icon: <ArchiveIcon />,
      visible: every((abilities) => !!abilities.archive),
      perform: perform(
        (document) => document.archive(),
        (count) => t("{{ count }} document archived", { count })
      ),
    },
    {
      key: "restore",
      label: t("Restore"),
      icon: <RestoreIcon />,
      visible: every(
        (abilities) => !!(abilities.restore || abilities.unarchive)
      ),
      perform: perform(
        (document) => document.restore(),
        (count) => t("{{ count }} document restored", { count })
      ),
    },
    {
      key: "delete",
      label: t("Delete"),
      icon: <TrashIcon />,
      dangerous: true,
      visible: every((abilities) => !!abilities.delete),
      perform: perform(
        (document) => document.delete(),
        (count) => t("{{ count }} document moved to trash", { count })
      ),
    },
  ];

  return <ModelSelectionToolbar selection={selection} actions={actions} />;
}

export default observer(DocumentSelectionToolbar);
