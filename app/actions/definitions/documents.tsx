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
  PinIcon,
  SearchIcon,
} from "outline-icons";
import * as React from "react";
import { getEventFiles } from "@shared/utils/files";
import DocumentTemplatizeDialog from "~/components/DocumentTemplatizeDialog";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import history from "~/utils/history";
import { homePath, newDocumentPath, searchPath } from "~/utils/routeHelpers";

export const openDocument = createAction({
  name: ({ t }) => t("Open document"),
  section: DocumentSection,
  shortcut: ["o", "d"],
  keywords: "go to",
  icon: <DocumentIcon />,
  children: ({ stores }) => {
    const paths = stores.collections.pathsToDocuments;

    return paths
      .filter((path) => path.type === "document")
      .map((path) => ({
        // Note: using url which includes the slug rather than id here to bust
        // cache if the document is renamed
        id: path.url,
        name: path.title,
        icon: () =>
          stores.documents.get(path.id)?.isStarred ? <StarredIcon /> : null,
        section: DocumentSection,
        perform: () => history.push(path.url),
      }));
  },
});

export const createDocument = createAction({
  name: ({ t }) => t("New document"),
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ activeCollectionId, stores }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  perform: ({ activeCollectionId, inStarredSection }) =>
    activeCollectionId &&
    history.push(newDocumentPath(activeCollectionId), {
      starred: inStarredSection,
    }),
});

export const starDocument = createAction({
  name: ({ t }) => t("Star"),
  section: DocumentSection,
  icon: <StarredIcon />,
  keywords: "favorite bookmark",
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    return (
      !document?.isStarred && stores.policies.abilities(activeDocumentId).star
    );
  },
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    document?.star();
  },
});

export const unstarDocument = createAction({
  name: ({ t }) => t("Unstar"),
  section: DocumentSection,
  icon: <UnstarredIcon />,
  keywords: "unfavorite unbookmark",
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    return (
      !!document?.isStarred &&
      stores.policies.abilities(activeDocumentId).unstar
    );
  },
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    document?.unstar();
  },
});

export const downloadDocument = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Download") : t("Download document"),
  section: DocumentSection,
  icon: <DownloadIcon />,
  keywords: "export",
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    document?.download();
  },
});

export const duplicateDocument = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Duplicate") : t("Duplicate document"),
  section: DocumentSection,
  icon: <DuplicateIcon />,
  keywords: "copy",
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).update,
  perform: async ({ activeDocumentId, t, stores }) => {
    if (!activeDocumentId) {
      return;
    }

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

/**
 * Pin a document to a collection. Pinned documents will be displayed at the top
 * of the collection for all collection members to see.
 */
export const pinDocumentToCollection = createAction({
  name: ({ t }) => t("Pin to collection"),
  section: DocumentSection,
  icon: <PinIcon />,
  iconInContextMenu: false,
  visible: ({ activeCollectionId, activeDocumentId, stores }) => {
    if (!activeDocumentId || !activeCollectionId) {
      return false;
    }

    const document = stores.documents.get(activeDocumentId);
    return (
      !!stores.policies.abilities(activeDocumentId).pin && !document?.pinned
    );
  },
  perform: async ({ activeDocumentId, activeCollectionId, t, stores }) => {
    if (!activeDocumentId || !activeCollectionId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.pin(document.collectionId);

    const collection = stores.collections.get(activeCollectionId);

    if (!collection || !location.pathname.startsWith(collection?.url)) {
      stores.toasts.showToast(t("Pinned to collection"));
    }
  },
});

/**
 * Pin a document to team home. Pinned documents will be displayed at the top
 * of the home screen for all team members to see.
 */
export const pinDocumentToHome = createAction({
  name: ({ t }) => t("Pin to home"),
  section: DocumentSection,
  icon: <PinIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, currentTeamId, stores }) => {
    if (!currentTeamId || !activeDocumentId) {
      return false;
    }

    const document = stores.documents.get(activeDocumentId);

    return (
      !!stores.policies.abilities(activeDocumentId).pinToHome &&
      !document?.pinnedToHome
    );
  },
  perform: async ({ activeDocumentId, location, t, stores }) => {
    if (!activeDocumentId) {
      return;
    }
    const document = stores.documents.get(activeDocumentId);

    await document?.pin();

    if (location.pathname !== homePath()) {
      stores.toasts.showToast(t("Pinned to team home"));
    }
  },
});

export const pinDocument = createAction({
  name: ({ t }) => t("Pin"),
  section: DocumentSection,
  icon: <PinIcon />,
  children: [pinDocumentToCollection, pinDocumentToHome],
});

export const printDocument = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Print") : t("Print document"),
  section: DocumentSection,
  icon: <PrintIcon />,
  visible: ({ activeDocumentId }) => !!activeDocumentId,
  perform: async () => {
    window.print();
  },
});

export const importDocument = createAction({
  name: ({ t }) => t("Import document"),
  section: DocumentSection,
  icon: <ImportIcon />,
  keywords: "upload",
  visible: ({ activeCollectionId, activeDocumentId, stores }) => {
    if (activeDocumentId) {
      return !!stores.policies.abilities(activeDocumentId).createChildDocument;
    }

    if (activeCollectionId) {
      return !!stores.policies.abilities(activeCollectionId).update;
    }

    return false;
  },
  perform: ({ activeCollectionId, activeDocumentId, stores }) => {
    const { documents, toasts } = stores;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = documents.importFileTypes.join(", ");

    input.onchange = async (ev) => {
      const files = getEventFiles(ev);

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
  name: ({ t }) => t("Templatize"),
  section: DocumentSection,
  icon: <ShapesIcon />,
  keywords: "new create template",
  visible: ({ activeCollectionId, activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    return (
      !!activeCollectionId &&
      stores.policies.abilities(activeCollectionId).update &&
      !document?.isTemplate &&
      !document?.isDeleted
    );
  },
  perform: ({ activeDocumentId, stores, t, event }) => {
    if (!activeDocumentId) {
      return;
    }
    event?.preventDefault();
    event?.stopPropagation();

    stores.dialogs.openModal({
      title: t("Create template"),
      isCentered: true,
      content: <DocumentTemplatizeDialog documentId={activeDocumentId} />,
    });
  },
});

export const searchDocumentsForQuery = (searchQuery: string) =>
  createAction({
    id: "search",
    section: DocumentSection,
    name: ({ t }) =>
      t(`Search documents for "{{searchQuery}}"`, { searchQuery }),
    icon: <SearchIcon />,
    perform: () => history.push(searchPath(searchQuery)),
    visible: ({ location }) => location.pathname !== searchPath(),
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
  pinDocumentToCollection,
  pinDocumentToHome,
];
