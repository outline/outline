import { observer } from "mobx-react";
import {
  ArchiveIcon,
  PinIcon,
  RestoreIcon,
  StarredIcon,
  TrashIcon,
  UnpublishIcon,
  UnstarredIcon,
} from "outline-icons";
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

  const every = (
    predicate: (
      document: Document,
      abilities: Record<string, boolean>
    ) => boolean
  ) =>
    selectedDocuments.length > 0 &&
    selectedDocuments.every((document) =>
      predicate(document, policies.abilities(document.id))
    );

  const perform =
    (
      operation: (document: Document) => Promise<unknown> | undefined,
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
        client.batch(() =>
          targets.map((document) => Promise.resolve(operation(document)))
        )
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
      key: "star",
      label: t("Star"),
      icon: <StarredIcon />,
      visible: every(
        (document, abilities) => !document.isStarred && !!abilities.star
      ),
      perform: perform(
        (document) => document.star(),
        (count) => t("{{ count }} document starred", { count })
      ),
    },
    {
      key: "unstar",
      label: t("Unstar"),
      icon: <UnstarredIcon />,
      visible: every(
        (document, abilities) => document.isStarred && !!abilities.unstar
      ),
      perform: perform(
        (document) => document.unstar(),
        (count) => t("{{ count }} document unstarred", { count })
      ),
    },
    {
      key: "pin",
      label: t("Pin"),
      icon: <PinIcon />,
      visible: every(
        (document, abilities) =>
          !!document.collectionId && !document.pinned && !!abilities.pin
      ),
      perform: perform(
        (document) => document.pin(document.collectionId),
        (count) => t("{{ count }} document pinned", { count })
      ),
    },
    {
      key: "unpin",
      label: t("Unpin"),
      icon: <PinIcon />,
      visible: every(
        (document, abilities) => document.pinned && !!abilities.unpin
      ),
      perform: perform(
        (document) => document.unpin(document.collectionId ?? undefined),
        (count) => t("{{ count }} document unpinned", { count })
      ),
    },
    {
      key: "archive",
      label: t("Archive"),
      icon: <ArchiveIcon />,
      visible: every((_, abilities) => !!abilities.archive),
      perform: perform(
        (document) => document.archive(),
        (count) => t("{{ count }} document archived", { count })
      ),
    },
    {
      key: "unpublish",
      label: t("Unpublish"),
      icon: <UnpublishIcon />,
      visible: every((_, abilities) => !!abilities.unpublish),
      perform: perform(
        (document) => document.unpublish(),
        (count) => t("{{ count }} document unpublished", { count })
      ),
    },
    {
      key: "restore",
      label: t("Restore"),
      icon: <RestoreIcon />,
      visible: every(
        (_, abilities) => !!(abilities.restore || abilities.unarchive)
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
      visible: every((_, abilities) => !!abilities.delete),
      perform: perform(
        (document) => document.delete(),
        (count) => t("{{ count }} document moved to trash", { count })
      ),
    },
  ];

  return <ModelSelectionToolbar selection={selection} actions={actions} />;
}

export default observer(DocumentSelectionToolbar);
