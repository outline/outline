import { observer } from "mobx-react";
import { ArchiveIcon, RestoreIcon, TrashIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useModelSelection } from "~/components/ModelSelectionContext";
import type { ModelSelectionAction } from "~/components/ModelSelectionToolbar";
import ModelSelectionToolbar from "~/components/ModelSelectionToolbar";
import type Document from "~/models/Document";
import useStores from "~/hooks/useStores";

/** The batch methods a bulk document action may invoke. */
type DocumentMethod = "archive" | "delete" | "restore";

/**
 * Configures the generic selection toolbar with bulk actions for documents,
 * dispatching them through the documents batch endpoint.
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

  const can = (ability: DocumentMethod) =>
    selectedDocuments.length > 0 &&
    selectedDocuments.every(
      (document) => policies.abilities(document.id)[ability]
    );

  const perform =
    (method: DocumentMethod, message: (count: number) => string) =>
    async () => {
      const targets = selectedDocuments;
      if (!targets.length) {
        return;
      }

      try {
        const { succeeded, failed } = await documents.batch(method, targets);
        selection.clear();

        if (succeeded > 0) {
          toast.success(message(succeeded));
        }
        if (failed > 0) {
          toast.error(
            t("{{ count }} document could not be updated", { count: failed })
          );
        }
      } catch (_err) {
        toast.error(t("Could not complete the action, please try again"));
      }
    };

  const actions: ModelSelectionAction[] = [
    {
      key: "archive",
      label: t("Archive"),
      icon: <ArchiveIcon />,
      visible: can("archive"),
      perform: perform("archive", (count) =>
        t("{{ count }} document archived", { count })
      ),
    },
    {
      key: "restore",
      label: t("Restore"),
      icon: <RestoreIcon />,
      visible: can("restore"),
      perform: perform("restore", (count) =>
        t("{{ count }} document restored", { count })
      ),
    },
    {
      key: "delete",
      label: t("Delete"),
      icon: <TrashIcon />,
      dangerous: true,
      visible: can("delete"),
      perform: perform("delete", (count) =>
        t("{{ count }} document moved to trash", { count })
      ),
    },
  ];

  return <ModelSelectionToolbar selection={selection} actions={actions} />;
}

export default observer(DocumentSelectionToolbar);
