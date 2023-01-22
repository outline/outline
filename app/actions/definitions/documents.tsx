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
  UnsubscribeIcon,
  SubscribeIcon,
  MoveIcon,
  TrashIcon,
  CrossIcon,
  ArchiveIcon,
  ShuffleIcon,
  HistoryIcon,
  LightBulbIcon,
  UnpublishIcon,
  PublishIcon,
} from "outline-icons";
import * as React from "react";
import { ExportContentType } from "@shared/types";
import { getEventFiles } from "@shared/utils/files";
import DocumentDelete from "~/scenes/DocumentDelete";
import DocumentMove from "~/scenes/DocumentMove";
import DocumentPermanentDelete from "~/scenes/DocumentPermanentDelete";
import DocumentPublish from "~/scenes/DocumentPublish";
import DocumentTemplatizeDialog from "~/components/DocumentTemplatizeDialog";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import env from "~/env";
import history from "~/utils/history";
import {
  documentInsightsUrl,
  documentHistoryUrl,
  homePath,
  newDocumentPath,
  searchPath,
} from "~/utils/routeHelpers";

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
  visible: ({ currentTeamId, stores }) =>
    !!currentTeamId && stores.policies.abilities(currentTeamId).createDocument,
  perform: ({ activeCollectionId, inStarredSection }) =>
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

export const publishDocument = createAction({
  name: ({ t }) => t("Publish"),
  section: DocumentSection,
  icon: <PublishIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    return (
      !!document?.isDraft && stores.policies.abilities(activeDocumentId).update
    );
  },
  perform: async ({ activeDocumentId, stores, t }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    if (document?.publishedAt) {
      return;
    }

    if (document?.collectionId) {
      await document.save({
        publish: true,
      });
      stores.toasts.showToast(t("Document published"), {
        type: "success",
      });
    } else if (document) {
      stores.dialogs.openModal({
        title: t("Publish document"),
        isCentered: true,
        content: <DocumentPublish document={document} />,
      });
    }
  },
});

export const unpublishDocument = createAction({
  name: ({ t }) => t("Unpublish"),
  section: DocumentSection,
  icon: <UnpublishIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    return stores.policies.abilities(activeDocumentId).unpublish;
  },
  perform: ({ activeDocumentId, stores, t }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);

    document?.unpublish();

    stores.toasts.showToast(t("Document unpublished"), {
      type: "success",
    });
  },
});

export const subscribeDocument = createAction({
  name: ({ t }) => t("Subscribe"),
  section: DocumentSection,
  icon: <SubscribeIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }

    const document = stores.documents.get(activeDocumentId);

    return (
      !document?.isSubscribed &&
      stores.policies.abilities(activeDocumentId).subscribe
    );
  },
  perform: ({ activeDocumentId, stores, t }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);

    document?.subscribe();

    stores.toasts.showToast(t("Subscribed to document notifications"), {
      type: "success",
    });
  },
});

export const unsubscribeDocument = createAction({
  name: ({ t }) => t("Unsubscribe"),
  section: DocumentSection,
  icon: <UnsubscribeIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }

    const document = stores.documents.get(activeDocumentId);

    return (
      !!document?.isSubscribed &&
      stores.policies.abilities(activeDocumentId).unsubscribe
    );
  },
  perform: ({ activeDocumentId, stores, currentUserId, t }) => {
    if (!activeDocumentId || !currentUserId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);

    document?.unsubscribe(currentUserId);

    stores.toasts.showToast(t("Unsubscribed from document notifications"), {
      type: "success",
    });
  },
});

export const downloadDocumentAsHTML = createAction({
  name: ({ t }) => t("HTML"),
  section: DocumentSection,
  keywords: "html export",
  icon: <DownloadIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    document?.download(ExportContentType.Html);
  },
});

export const downloadDocumentAsPDF = createAction({
  name: ({ t }) => t("PDF"),
  section: DocumentSection,
  keywords: "export",
  icon: <DownloadIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId &&
    stores.policies.abilities(activeDocumentId).download &&
    env.PDF_EXPORT_ENABLED,
  perform: ({ activeDocumentId, t, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const id = stores.toasts.showToast(`${t("Exporting")}…`, {
      type: "loading",
      timeout: 30 * 1000,
    });

    const document = stores.documents.get(activeDocumentId);
    document
      ?.download(ExportContentType.Pdf)
      .finally(() => id && stores.toasts.hideToast(id));
  },
});

export const downloadDocumentAsMarkdown = createAction({
  name: ({ t }) => t("Markdown"),
  section: DocumentSection,
  keywords: "md markdown export",
  icon: <DownloadIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    document?.download(ExportContentType.Markdown);
  },
});

export const downloadDocument = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Download") : t("Download document"),
  section: DocumentSection,
  icon: <DownloadIcon />,
  keywords: "export",
  children: [
    downloadDocumentAsHTML,
    downloadDocumentAsPDF,
    downloadDocumentAsMarkdown,
  ],
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
  name: ({ activeDocumentId = "", t, stores }) => {
    const selectedDocument = stores.documents.get(activeDocumentId);
    const collectionName = selectedDocument
      ? stores.documents.getCollectionForDocument(selectedDocument)?.name
      : t("collection");

    return t("Pin to {{collectionName}}", {
      collectionName,
    });
  },

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
    return !!(
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

export const openRandomDocument = createAction({
  id: "random",
  section: DocumentSection,
  name: ({ t }) => t(`Open random document`),
  icon: <ShuffleIcon />,
  perform: ({ stores, activeDocumentId }) => {
    const documentPaths = stores.collections.pathsToDocuments.filter(
      (path) => path.type === "document" && path.id !== activeDocumentId
    );
    const documentPath =
      documentPaths[Math.round(Math.random() * documentPaths.length)];

    if (documentPath) {
      history.push(documentPath.url);
    }
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

export const moveDocument = createAction({
  name: ({ t }) => t("Move"),
  section: DocumentSection,
  icon: <MoveIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).move;
  },
  perform: ({ activeDocumentId, stores, t }) => {
    if (activeDocumentId) {
      const document = stores.documents.get(activeDocumentId);
      if (!document) {
        return;
      }

      stores.dialogs.openModal({
        title: t("Move {{ documentName }}", {
          documentName: document.noun,
        }),
        content: (
          <DocumentMove
            document={document}
            onRequestClose={stores.dialogs.closeAllModals}
          />
        ),
      });
    }
  },
});

export const archiveDocument = createAction({
  name: ({ t }) => t("Archive"),
  section: DocumentSection,
  icon: <ArchiveIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).archive;
  },
  perform: async ({ activeDocumentId, stores, t }) => {
    if (activeDocumentId) {
      const document = stores.documents.get(activeDocumentId);
      if (!document) {
        return;
      }

      await document.archive();
      stores.toasts.showToast(t("Document archived"), {
        type: "success",
      });
    }
  },
});

export const deleteDocument = createAction({
  name: ({ t }) => t("Delete"),
  section: DocumentSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).delete;
  },
  perform: ({ activeDocumentId, stores, t }) => {
    if (activeDocumentId) {
      const document = stores.documents.get(activeDocumentId);
      if (!document) {
        return;
      }

      stores.dialogs.openModal({
        title: t("Delete {{ documentName }}", {
          documentName: document.noun,
        }),
        isCentered: true,
        content: (
          <DocumentDelete
            document={document}
            onSubmit={stores.dialogs.closeAllModals}
          />
        ),
      });
    }
  },
});

export const permanentlyDeleteDocument = createAction({
  name: ({ t }) => t("Permanently delete"),
  section: DocumentSection,
  icon: <CrossIcon />,
  dangerous: true,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).permanentDelete;
  },
  perform: ({ activeDocumentId, stores, t }) => {
    if (activeDocumentId) {
      const document = stores.documents.get(activeDocumentId);
      if (!document) {
        return;
      }

      stores.dialogs.openModal({
        title: t("Permanently delete {{ documentName }}", {
          documentName: document.noun,
        }),
        isCentered: true,
        content: (
          <DocumentPermanentDelete
            document={document}
            onSubmit={stores.dialogs.closeAllModals}
          />
        ),
      });
    }
  },
});

export const openDocumentHistory = createAction({
  name: ({ t }) => t("History"),
  section: DocumentSection,
  icon: <HistoryIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");
    return !!activeDocumentId && can.read && !can.restore;
  },
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }
    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }
    history.push(documentHistoryUrl(document));
  },
});

export const openDocumentInsights = createAction({
  name: ({ t }) => t("Insights"),
  section: DocumentSection,
  icon: <LightBulbIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");
    return !!activeDocumentId && can.read;
  },
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }
    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }
    history.push(documentInsightsUrl(document));
  },
});

export const rootDocumentActions = [
  openDocument,
  archiveDocument,
  createDocument,
  createTemplate,
  deleteDocument,
  importDocument,
  downloadDocument,
  starDocument,
  unstarDocument,
  publishDocument,
  unpublishDocument,
  subscribeDocument,
  unsubscribeDocument,
  duplicateDocument,
  moveDocument,
  openRandomDocument,
  permanentlyDeleteDocument,
  printDocument,
  pinDocumentToCollection,
  pinDocumentToHome,
  openDocumentHistory,
  openDocumentInsights,
];
