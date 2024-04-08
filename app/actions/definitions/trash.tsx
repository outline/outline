import { TrashIcon } from "outline-icons";
import React from "react";
import DeleteDocumentsInTrash from "~/scenes/Trash/components/DeleteDocumentsInTrash";
import { createAction } from "~/actions";
import { TrashSection } from "~/actions/sections";
import { trashPath } from "~/utils/routeHelpers";

export const permanentlyDeleteDocumentsInTrash = createAction({
  name: ({ t }) => t("Empty"),
  analyticsName: "Empty Trash",
  section: TrashSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: ({ stores }) => stores.documents.deleted.length > 0,
  perform: ({ stores, t, location }) => {
    stores.dialogs.openModal({
      title: t("Permanently delete all documents"),
      content: (
        <DeleteDocumentsInTrash
          onSubmit={stores.dialogs.closeAllModals}
          shouldRedirect={location.pathname === trashPath()}
        />
      ),
    });
  },
});

export const rootTrashActions = [permanentlyDeleteDocumentsInTrash];
