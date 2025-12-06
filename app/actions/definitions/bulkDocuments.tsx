import { ArchiveIcon, MoveIcon, TrashIcon } from "outline-icons";
import DocumentMove from "~/scenes/DocumentMove";
import { createAction } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";
import DocumentDelete from "~/scenes/DocumentDelete";
import DocumentArchive from "~/scenes/DocumentArchive";
import Document from "~/models/Document";

type Props = {
  documents: Document[];
};

/**
 * Archive multiple documents at once.
 */
export const bulkArchiveDocuments = ({ documents }: Props) =>
  createAction({
    name: ({ t }) => `${t("Archive")}…`,
    analyticsName: "Bulk archive documents",
    section: ActiveDocumentSection,
    icon: <ArchiveIcon />,
    visible: ({ stores }) => {
      if (documents.length === 0) {
        return false;
      }
      return documents.every(({ id }) => stores.policies.abilities(id).archive);
    },
    perform: async ({ stores, t }) => {
      const { dialogs, documents: documentsStore } = stores;
      const count = documents.length;

      if (count === 0) {
        return;
      }

      dialogs.openModal({
        title: t("Archive {{ count }} documents", { count }),
        content: (
          <DocumentArchive
            documents={documents}
            onSubmit={() => documentsStore.clearSelection()}
          />
        ),
      });
    },
  });

/**
 * Move multiple documents at once.
 */
export const bulkMoveDocuments = ({ documents }: Props) =>
  createAction({
    name: ({ t }) => `${t("Move")}…`,
    analyticsName: "Bulk move documents",
    section: ActiveDocumentSection,
    icon: <MoveIcon />,
    visible: ({ stores }) => {
      if (documents.length === 0) {
        return false;
      }
      return documents.every(({ id }) => stores.policies.abilities(id).move);
    },
    perform: ({ stores, t }) => {
      const { dialogs, documents: documentsStore } = stores;
      const count = documents.length;

      if (count === 0) {
        return;
      }

      dialogs.openModal({
        title: t("Move {{ count }} documents", { count }),
        content: (
          <DocumentMove
            documents={documents}
            onSubmit={() => documentsStore.clearSelection()}
          />
        ),
      });
    },
  });

/**
 * Delete multiple documents at once.
 */
export const bulkDeleteDocuments = ({ documents }: Props) =>
  createAction({
    name: ({ t }) => `${t("Delete")}…`,
    analyticsName: "Bulk delete documents",
    section: ActiveDocumentSection,
    icon: <TrashIcon />,
    dangerous: true,
    visible: ({ stores }) => {
      if (documents.length === 0) {
        return false;
      }
      return documents.every(({ id }) => stores.policies.abilities(id).delete);
    },
    perform: async ({ stores, t }) => {
      const { dialogs, documents: documentsStore } = stores;
      const count = documents.length;

      if (count === 0) {
        return;
      }

      dialogs.openModal({
        title: t("Delete {{ count }} documents", { count }),
        content: (
          <DocumentDelete
            documents={documents}
            onSubmit={() => documentsStore.clearSelection()}
          />
        ),
      });
    },
  });

export const rootBulkDocumentActions = [
  bulkArchiveDocuments,
  bulkMoveDocuments,
  bulkDeleteDocuments,
];
