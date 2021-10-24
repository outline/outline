// @flow
import {
  StarredIcon,
  DocumentIcon,
  NewDocumentIcon,
  ImportIcon,
} from "outline-icons";
import * as React from "react";
import { createAction } from "actions";
import { DocumentSection } from "actions/sections";
import getDataTransferFiles from "utils/getDataTransferFiles";
import history from "utils/history";
import { newDocumentPath } from "utils/routeHelpers";

export const openDocument = createAction({
  name: ({ t }) => t("Open document"),
  section: DocumentSection,
  shortcut: ["o", "d"],
  icon: <DocumentIcon />,
  children: ({ stores }) => {
    const paths = stores.collections.pathsToDocuments;

    return paths
      .filter((path) => path.type === "document")
      .map((path) => ({
        id: path.id,
        name: path.title,
        icon: () =>
          stores.documents.get(path.id)?.isStarred ? (
            <StarredIcon />
          ) : undefined,
        section: DocumentSection,
        perform: () => history.push(path.url),
      }));
  },
});

export const createDocument = createAction({
  name: ({ t }) => t("New document"),
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  visible: ({ activeCollectionId, stores }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  perform: ({ activeCollectionId }) =>
    activeCollectionId && history.push(newDocumentPath(activeCollectionId)),
});

export const importDocument = createAction({
  name: ({ t }) => t("Import document"),
  section: DocumentSection,
  icon: <ImportIcon />,
  visible: ({ activeCollectionId, stores }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  perform: ({ activeCollectionId, stores }) => {
    const { documents, toasts } = stores;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = documents.importFileTypes.join(", ");
    input.onchange = async (ev: SyntheticEvent<>) => {
      const files = getDataTransferFiles(ev);

      try {
        const file = files[0];
        const document = await documents.import(
          file,
          null,
          activeCollectionId,
          {
            publish: true,
          }
        );
        history.push(document.url);
      } catch (err) {
        toasts.showToast(err.message, {
          type: "error",
        });

        throw err;
      }
    };
    input.click();
  },
});

export const rootDocumentActions = [openDocument, importDocument];
