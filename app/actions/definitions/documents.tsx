import invariant from "invariant";
import {
  DownloadIcon,
  DuplicateIcon,
  StarredIcon,
  PrintIcon,
  UnstarredIcon,
  DocumentIcon,
  NewDocumentIcon,
  ShapesIcon,
  ImportIcon,
} from "outline-icons";
import * as React from "react";
import DocumentTemplatize from "scenes/DocumentTemplatize";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions' or its corresponding ... Remove this comment to see the full error message
import { createAction } from "actions";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions/sections' or its corre... Remove this comment to see the full error message
import { DocumentSection } from "actions/sections";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/getDataTransferFiles' or... Remove this comment to see the full error message
import getDataTransferFiles from "utils/getDataTransferFiles";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/history' or its correspo... Remove this comment to see the full error message
import history from "utils/history";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { newDocumentPath } from "utils/routeHelpers";

export const openDocument = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Open document"),
  section: DocumentSection,
  shortcut: ["o", "d"],
  keywords: "go to",
  icon: <DocumentIcon />,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'stores' implicitly has an 'any' t... Remove this comment to see the full error message
  children: ({ stores }) => {
    const paths = stores.collections.pathsToDocuments;
    return (
      paths
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'path' implicitly has an 'any' type.
        .filter((path) => path.type === "document")
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'path' implicitly has an 'any' type.
        .map((path) => ({
          // Note: using url which includes the slug rather than id here to bust
          // cache if the document is renamed
          id: path.url,
          name: path.title,
          icon: () =>
            stores.documents.get(path.id)?.isStarred ? (
              <StarredIcon />
            ) : undefined,
          section: DocumentSection,
          perform: () => history.push(path.url),
        }))
    );
  },
});

export const createDocument = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("New document"),
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeCollectionId' implicitly ha... Remove this comment to see the full error message
  visible: ({ activeCollectionId, stores }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeCollectionId' implicitly ha... Remove this comment to see the full error message
  perform: ({ activeCollectionId }) =>
    activeCollectionId && history.push(newDocumentPath(activeCollectionId)),
});

export const starDocument = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Star"),
  section: DocumentSection,
  icon: <StarredIcon />,
  keywords: "favorite bookmark",
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeDocumentId' implicitly has ... Remove this comment to see the full error message
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) return false;
    const document = stores.documents.get(activeDocumentId);
    return (
      !document?.isStarred && stores.policies.abilities(activeDocumentId).star
    );
  },
  // @ts-expect-error ts-migrate(7030) FIXME: Not all code paths return a value.
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) return false;
    const document = stores.documents.get(activeDocumentId);
    document?.star();
  },
});

export const unstarDocument = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Unstar"),
  section: DocumentSection,
  icon: <UnstarredIcon />,
  keywords: "unfavorite unbookmark",
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeDocumentId' implicitly has ... Remove this comment to see the full error message
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) return false;
    const document = stores.documents.get(activeDocumentId);
    return (
      !!document?.isStarred &&
      stores.policies.abilities(activeDocumentId).unstar
    );
  },
  // @ts-expect-error ts-migrate(7030) FIXME: Not all code paths return a value.
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) return false;
    const document = stores.documents.get(activeDocumentId);
    document?.unstar();
  },
});

export const downloadDocument = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Download") : t("Download document"),
  section: DocumentSection,
  icon: <DownloadIcon />,
  keywords: "export",
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeDocumentId' implicitly has ... Remove this comment to see the full error message
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  // @ts-expect-error ts-migrate(7030) FIXME: Not all code paths return a value.
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) return false;
    const document = stores.documents.get(activeDocumentId);
    document?.download();
  },
});

export const duplicateDocument = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Duplicate") : t("Duplicate document"),
  section: DocumentSection,
  icon: <DuplicateIcon />,
  keywords: "copy",
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeDocumentId' implicitly has ... Remove this comment to see the full error message
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).update,
  // @ts-expect-error ts-migrate(7030) FIXME: Not all code paths return a value.
  perform: async ({ activeDocumentId, t, stores }) => {
    if (!activeDocumentId) return false;
    const document = stores.documents.get(activeDocumentId);
    invariant(document, "Document must exist");
    const duped = await document.duplicate();
    // when duplicating, go straight to the duplicated document content
    history.push(duped.url);
    stores.toasts.showToast(t("Document duplicated"), {
      type: "success",
    });
  },
});

export const printDocument = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Print") : t("Print document"),
  section: DocumentSection,
  icon: <PrintIcon />,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeDocumentId' implicitly has ... Remove this comment to see the full error message
  visible: ({ activeDocumentId }) => !!activeDocumentId,
  perform: async () => {
    window.print();
  },
});

export const importDocument = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t, activeDocumentId }) => t("Import document"),
  section: DocumentSection,
  icon: <ImportIcon />,
  keywords: "upload",
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeCollectionId' implicitly ha... Remove this comment to see the full error message
  visible: ({ activeCollectionId, activeDocumentId, stores }) => {
    if (activeDocumentId) {
      return !!stores.policies.abilities(activeDocumentId).createChildDocument;
    }

    if (activeCollectionId) {
      return !!stores.policies.abilities(activeCollectionId).update;
    }

    return false;
  },
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeCollectionId' implicitly ha... Remove this comment to see the full error message
  perform: ({ activeCollectionId, activeDocumentId, stores }) => {
    const { documents, toasts } = stores;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = documents.importFileTypes.join(", ");

    // @ts-expect-error ts-migrate(2322) FIXME: Type '(ev: React.SyntheticEvent) => Promise<void>'... Remove this comment to see the full error message
    input.onchange = async (ev: React.SyntheticEvent) => {
      const files = getDataTransferFiles(ev);

      try {
        const file = files[0];
        const document = await documents.import(
          file,
          activeDocumentId,
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

export const createTemplate = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Templatize"),
  section: DocumentSection,
  icon: <ShapesIcon />,
  keywords: "new create template",
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeCollectionId' implicitly ha... Remove this comment to see the full error message
  visible: ({ activeCollectionId, activeDocumentId, stores }) => {
    if (!activeDocumentId) return false;
    const document = stores.documents.get(activeDocumentId);
    return (
      !!activeCollectionId &&
      stores.policies.abilities(activeCollectionId).update &&
      !document?.isTemplate
    );
  },
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'activeDocumentId' implicitly has ... Remove this comment to see the full error message
  perform: ({ activeDocumentId, stores, t, event }) => {
    event?.preventDefault();
    event?.stopPropagation();
    stores.dialogs.openModal({
      title: t("Create template"),
      content: (
        <DocumentTemplatize
          documentId={activeDocumentId}
          onSubmit={stores.dialogs.closeAllModals}
        />
      ),
    });
  },
});

export const rootDocumentActions = [
  openDocument,
  createDocument,
  createTemplate,
  importDocument,
  downloadDocument,
  starDocument,
  unstarDocument,
  duplicateDocument,
  printDocument,
];
