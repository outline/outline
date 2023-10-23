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
  CommentIcon,
} from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import { ExportContentType, TeamPreference } from "@shared/types";
import { getEventFiles } from "@shared/utils/files";
import DocumentDelete from "~/scenes/DocumentDelete";
import DocumentMove from "~/scenes/DocumentMove";
import DocumentPermanentDelete from "~/scenes/DocumentPermanentDelete";
import DocumentPublish from "~/scenes/DocumentPublish";
import DocumentTemplatizeDialog from "~/components/DocumentTemplatizeDialog";
import DuplicateDialog from "~/components/DuplicateDialog";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import env from "~/env";
import history from "~/utils/history";
import {
  documentInsightsPath,
  documentHistoryPath,
  homePath,
  newDocumentPath,
  searchPath,
  documentPath,
} from "~/utils/routeHelpers";

export const openDocument = createAction({
  name: ({ t }) => t("Open document"),
  analyticsName: "Open document",
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
        icon: function _Icon() {
          return stores.documents.get(path.id)?.isStarred ? (
            <StarredIcon />
          ) : null;
        },
        section: DocumentSection,
        perform: () => history.push(path.url),
      }));
  },
});

export const createDocument = createAction({
  name: ({ t }) => t("New document"),
  analyticsName: "New document",
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

export const createDocumentFromTemplate = createAction({
  name: ({ t }) => t("New from template"),
  analyticsName: "New document",
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, activeDocumentId, stores }) =>
    !!currentTeamId &&
    !!activeDocumentId &&
    !!stores.documents.get(activeDocumentId)?.template &&
    stores.policies.abilities(currentTeamId).createDocument,
  perform: ({ activeCollectionId, activeDocumentId, inStarredSection }) =>
    history.push(
      newDocumentPath(activeCollectionId, { templateId: activeDocumentId }),
      {
        starred: inStarredSection,
      }
    ),
});

export const createNestedDocument = createAction({
  name: ({ t }) => t("New nested document"),
  analyticsName: "New document",
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, activeDocumentId, stores }) =>
    !!currentTeamId &&
    !!activeDocumentId &&
    stores.policies.abilities(currentTeamId).createDocument &&
    stores.policies.abilities(activeDocumentId).createChildDocument,
  perform: ({ activeCollectionId, activeDocumentId, inStarredSection }) =>
    history.push(
      newDocumentPath(activeCollectionId, {
        parentDocumentId: activeDocumentId,
      }),
      {
        starred: inStarredSection,
      }
    ),
});

export const starDocument = createAction({
  name: ({ t }) => t("Star"),
  analyticsName: "Star document",
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
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.star();
  },
});

export const unstarDocument = createAction({
  name: ({ t }) => t("Unstar"),
  analyticsName: "Unstar document",
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
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.unstar();
  },
});

export const publishDocument = createAction({
  name: ({ t }) => t("Publish"),
  analyticsName: "Publish document",
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
      await document.save(undefined, {
        publish: true,
      });
      toast.success(
        t("Published {{ documentName }}", {
          documentName: document.noun,
        })
      );
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
  analyticsName: "Unpublish document",
  section: DocumentSection,
  icon: <UnpublishIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    return stores.policies.abilities(activeDocumentId).unpublish;
  },
  perform: async ({ activeDocumentId, stores, t }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }

    try {
      await document.unpublish();

      toast.success(
        t("Unpublished {{ documentName }}", {
          documentName: document.noun,
        })
      );
    } catch (err) {
      toast.error(err.message);
    }
  },
});

export const subscribeDocument = createAction({
  name: ({ t }) => t("Subscribe"),
  analyticsName: "Subscribe to document",
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
  perform: async ({ activeDocumentId, stores, t }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);

    await document?.subscribe();

    toast.success(t("Subscribed to document notifications"));
  },
});

export const unsubscribeDocument = createAction({
  name: ({ t }) => t("Unsubscribe"),
  analyticsName: "Unsubscribe from document",
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
  perform: async ({ activeDocumentId, stores, currentUserId, t }) => {
    if (!activeDocumentId || !currentUserId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);

    await document?.unsubscribe(currentUserId);

    toast.success(t("Unsubscribed from document notifications"));
  },
});

export const downloadDocumentAsHTML = createAction({
  name: ({ t }) => t("HTML"),
  analyticsName: "Download document as HTML",
  section: DocumentSection,
  keywords: "html export",
  icon: <DownloadIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.download(ExportContentType.Html);
  },
});

export const downloadDocumentAsPDF = createAction({
  name: ({ t }) => t("PDF"),
  analyticsName: "Download document as PDF",
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

    const id = toast.loading(`${t("Exporting")}…`);
    const document = stores.documents.get(activeDocumentId);
    document
      ?.download(ExportContentType.Pdf)
      .finally(() => id && toast.dismiss(id));
  },
});

export const downloadDocumentAsMarkdown = createAction({
  name: ({ t }) => t("Markdown"),
  analyticsName: "Download document as Markdown",
  section: DocumentSection,
  keywords: "md markdown export",
  icon: <DownloadIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.download(ExportContentType.Markdown);
  },
});

export const downloadDocument = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Download") : t("Download document"),
  analyticsName: "Download document",
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
  analyticsName: "Duplicate document",
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

    stores.dialogs.openModal({
      title: t("Copy document"),
      isCentered: true,
      content: (
        <DuplicateDialog
          document={document}
          onSubmit={(response) => {
            stores.dialogs.closeAllModals();
            history.push(documentPath(response[0]));
          }}
        />
      ),
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
  analyticsName: "Pin document to collection",
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

    try {
      const document = stores.documents.get(activeDocumentId);
      await document?.pin(document.collectionId);

      const collection = stores.collections.get(activeCollectionId);

      if (!collection || !location.pathname.startsWith(collection?.url)) {
        toast.success(t("Pinned to collection"));
      }
    } catch (err) {
      toast.error(err.message);
    }
  },
});

/**
 * Pin a document to team home. Pinned documents will be displayed at the top
 * of the home screen for all team members to see.
 */
export const pinDocumentToHome = createAction({
  name: ({ t }) => t("Pin to home"),
  analyticsName: "Pin document to home",
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

    try {
      await document?.pin();

      if (location.pathname !== homePath()) {
        toast.success(t("Pinned to home"));
      }
    } catch (err) {
      toast.error(err.message);
    }
  },
});

export const pinDocument = createAction({
  name: ({ t }) => t("Pin"),
  analyticsName: "Pin document",
  section: DocumentSection,
  icon: <PinIcon />,
  children: [pinDocumentToCollection, pinDocumentToHome],
});

export const printDocument = createAction({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Print") : t("Print document"),
  analyticsName: "Print document",
  section: DocumentSection,
  icon: <PrintIcon />,
  visible: ({ activeDocumentId }) => !!(activeDocumentId && window.print),
  perform: async () => {
    queueMicrotask(window.print);
  },
});

export const importDocument = createAction({
  name: ({ t }) => t("Import document"),
  analyticsName: "Import document",
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
    const { documents } = stores;
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
        toast.error(err.message);
        throw err;
      }
    };

    input.click();
  },
});

export const createTemplate = createAction({
  name: ({ t }) => t("Templatize"),
  analyticsName: "Templatize document",
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
  name: ({ t }) => t(`Open random document`),
  analyticsName: "Open random document",
  section: DocumentSection,
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
    name: ({ t }) =>
      t(`Search documents for "{{searchQuery}}"`, { searchQuery }),
    analyticsName: "Search documents",
    section: DocumentSection,
    icon: <SearchIcon />,
    perform: () => history.push(searchPath(searchQuery)),
    visible: ({ location }) => location.pathname !== searchPath(),
  });

export const moveDocument = createAction({
  name: ({ t }) => t("Move"),
  analyticsName: "Move document",
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
        title: t("Move {{ documentType }}", {
          documentType: document.noun,
        }),
        isCentered: true,
        content: <DocumentMove document={document} />,
      });
    }
  },
});

export const archiveDocument = createAction({
  name: ({ t }) => t("Archive"),
  analyticsName: "Archive document",
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
      toast.success(t("Document archived"));
    }
  },
});

export const deleteDocument = createAction({
  name: ({ t }) => t("Delete"),
  analyticsName: "Delete document",
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
  analyticsName: "Permanently delete document",
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

export const openDocumentComments = createAction({
  name: ({ t }) => t("Comments"),
  analyticsName: "Open comments",
  section: DocumentSection,
  icon: <CommentIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");
    return (
      !!activeDocumentId &&
      can.read &&
      !can.restore &&
      !!stores.auth.team?.getPreference(TeamPreference.Commenting)
    );
  },
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    stores.ui.toggleComments(activeDocumentId);
  },
});

export const openDocumentHistory = createAction({
  name: ({ t }) => t("History"),
  analyticsName: "Open document history",
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
    history.push(documentHistoryPath(document));
  },
});

export const openDocumentInsights = createAction({
  name: ({ t }) => t("Insights"),
  analyticsName: "Open document insights",
  section: DocumentSection,
  icon: <LightBulbIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;

    return (
      !!activeDocumentId &&
      can.read &&
      !document?.isTemplate &&
      !document?.isDeleted
    );
  },
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }
    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }
    history.push(documentInsightsPath(document));
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
  openDocumentComments,
  openDocumentHistory,
  openDocumentInsights,
];
