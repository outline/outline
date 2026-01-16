import copy from "copy-to-clipboard";
import invariant from "invariant";
import uniqBy from "lodash/uniqBy";
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
  GraphIcon,
  UnpublishIcon,
  PublishIcon,
  CommentIcon,
  CopyIcon,
  PadlockIcon,
  GlobeIcon,
  LogoutIcon,
  CaseSensitiveIcon,
  RestoreIcon,
  EditIcon,
} from "outline-icons";
import { toast } from "sonner";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { ExportContentType, TeamPreference } from "@shared/types";
import { getEventFiles } from "@shared/utils/files";
import { Week } from "@shared/utils/time";
import type UserMembership from "~/models/UserMembership";
import { client } from "~/utils/ApiClient";
import DocumentDelete from "~/scenes/DocumentDelete";
import DocumentMove from "~/scenes/DocumentMove";
import DocumentPermanentDelete from "~/scenes/DocumentPermanentDelete";
import DocumentPublish from "~/scenes/DocumentPublish";
import DeleteDocumentsInTrash from "~/scenes/Trash/components/DeleteDocumentsInTrash";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DocumentCopy from "~/components/DocumentCopy";
import { DocumentDownload } from "~/components/DocumentDownload";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import { getHeaderExpandedKey } from "~/components/Sidebar/components/Header";
import DocumentTemplatizeDialog from "~/components/TemplatizeDialog";
import {
  createAction,
  createActionGroup,
  createActionWithChildren,
  createInternalLinkAction,
} from "~/actions";
import {
  ActiveDocumentSection,
  DocumentSection,
  TrashSection,
} from "~/actions/sections";
import { setPersistedState } from "~/hooks/usePersistedState";
import history from "~/utils/history";
import {
  documentHistoryPath,
  homePath,
  newDocumentPath,
  newNestedDocumentPath,
  searchPath,
  documentPath,
  urlify,
  trashPath,
  documentEditPath,
} from "~/utils/routeHelpers";
import capitalize from "lodash/capitalize";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import type { Action, ActionGroup, ActionSeparator } from "~/types";
import lazyWithRetry from "~/utils/lazyWithRetry";
import env from "~/env";

const Insights = lazyWithRetry(
  () => import("~/scenes/Document/components/Insights")
);
const SharePopover = lazyWithRetry(
  () => import("~/components/Sharing/Document/SharePopover")
);

export const openDocument = createActionWithChildren({
  name: ({ t }) => t("Open document"),
  analyticsName: "Open document",
  section: DocumentSection,
  shortcut: ["o", "d"],
  keywords: "go to",
  icon: <DocumentIcon />,
  children: ({ stores }) => {
    const nodes = stores.collections.navigationNodes.reduce(
      (acc, node) => [...acc, ...node.children],
      [] as NavigationNode[]
    );
    const documents = stores.documents.orderedData;

    return uniqBy([...documents, ...nodes], "id").map((item) =>
      createInternalLinkAction({
        // Note: using url which includes the slug rather than id here to bust
        // cache if the document is renamed
        id: item.url,
        name: item.title,
        icon: item.icon ? (
          <Icon
            value={item.icon}
            initial={item.title}
            color={item.color ?? undefined}
          />
        ) : (
          <DocumentIcon />
        ),
        section: DocumentSection,
        to: item.url,
      })
    );
  },
});

export const editDocument = createInternalLinkAction({
  name: ({ t }) => t("Edit"),
  analyticsName: "Edit document",
  section: ActiveDocumentSection,
  keywords: "edit",
  icon: <EditIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const { auth, documents, policies } = stores;

    const document = activeDocumentId
      ? documents.get(activeDocumentId)
      : undefined;
    const can = activeDocumentId
      ? policies.abilities(activeDocumentId)
      : undefined;

    return (
      !!can?.update && !!auth.user?.separateEditMode && !document?.template
    );
  },
  to: ({ activeDocumentId, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return "";
    }

    return documentEditPath(document);
  },
});

export const createDocument = createInternalLinkAction({
  name: ({ t }) => t("New document"),
  analyticsName: "New document",
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, activeCollectionId, stores }) => {
    if (
      activeCollectionId &&
      !stores.policies.abilities(activeCollectionId).createDocument
    ) {
      return false;
    }

    return (
      !!currentTeamId && stores.policies.abilities(currentTeamId).createDocument
    );
  },
  to: ({ activeCollectionId, sidebarContext }) => {
    const [pathname, search] = newDocumentPath(activeCollectionId).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const createDraftDocument = createInternalLinkAction({
  name: ({ t }) => t("New draft"),
  analyticsName: "New document",
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create document",
  visible: ({ currentTeamId, stores }) =>
    !!currentTeamId && stores.policies.abilities(currentTeamId).createDocument,
  to: ({ sidebarContext }) => ({
    pathname: newDocumentPath(),
    state: { sidebarContext },
  }),
});

export const createDocumentFromTemplate = createInternalLinkAction({
  name: ({ t }) => t("New from template"),
  analyticsName: "New document",
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({
    currentTeamId,
    activeCollectionId,
    activeDocumentId,
    stores,
  }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;

    if (
      !currentTeamId ||
      !document?.isTemplate ||
      !!document?.isDraft ||
      !!document?.isDeleted
    ) {
      return false;
    }

    if (activeCollectionId) {
      return stores.policies.abilities(activeCollectionId).createDocument;
    }
    return stores.policies.abilities(currentTeamId).createDocument;
  },
  to: ({ activeDocumentId, activeCollectionId, sidebarContext }) => {
    if (!activeDocumentId || !activeCollectionId) {
      return "";
    }

    const [pathname, search] = newDocumentPath(activeCollectionId, {
      templateId: activeDocumentId,
    }).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const createNestedDocument = createInternalLinkAction({
  name: ({ t }) => t("New nested document"),
  analyticsName: "New document",
  section: ActiveDocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, activeDocumentId, stores }) =>
    !!currentTeamId &&
    !!activeDocumentId &&
    stores.policies.abilities(currentTeamId).createDocument &&
    stores.policies.abilities(activeDocumentId).createChildDocument,
  to: ({ activeDocumentId, sidebarContext }) => {
    const [pathname, search] =
      newNestedDocumentPath(activeDocumentId).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const starDocument = createAction({
  name: ({ t }) => t("Star"),
  analyticsName: "Star document",
  section: ActiveDocumentSection,
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
    setPersistedState(getHeaderExpandedKey("starred"), true);
  },
});

export const unstarDocument = createAction({
  name: ({ t }) => t("Unstar"),
  analyticsName: "Unstar document",
  section: ActiveDocumentSection,
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
  section: ActiveDocumentSection,
  icon: <PublishIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    return (
      !!document?.isDraft && stores.policies.abilities(activeDocumentId).publish
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

    if (document?.collectionId || document?.template) {
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
        content: <DocumentPublish document={document} />,
      });
    }
  },
});

export const unpublishDocument = createAction({
  name: ({ t }) => t("Unpublish"),
  analyticsName: "Unpublish document",
  section: ActiveDocumentSection,
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

    await document.unpublish();

    toast.success(
      t("Unpublished {{ documentName }}", {
        documentName: document.noun,
      })
    );
  },
});

export const subscribeDocument = createAction({
  name: ({ t }) => t("Subscribe"),
  analyticsName: "Subscribe to document",
  section: ActiveDocumentSection,
  icon: <SubscribeIcon />,
  tooltip: ({ activeCollectionId, isMenu, stores, t }) => {
    if (!isMenu || !activeCollectionId) {
      return undefined;
    }

    return stores.collections.get(activeCollectionId)?.isSubscribed
      ? t("Subscription inherited from collection")
      : undefined;
  },
  disabled: ({ activeCollectionId, isMenu, stores }) => {
    if (!isMenu || !activeCollectionId) {
      return false;
    }

    return !!stores.collections.get(activeCollectionId)?.isSubscribed;
  },
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }

    const document = stores.documents.get(activeDocumentId);

    return (
      !!document?.isActive &&
      !document?.collection?.isSubscribed &&
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
  section: ActiveDocumentSection,
  icon: <UnsubscribeIcon />,
  tooltip: ({ activeCollectionId, isMenu, stores, t }) => {
    if (!isMenu || !activeCollectionId) {
      return undefined;
    }

    return stores.collections.get(activeCollectionId)?.isSubscribed
      ? t("Subscription inherited from collection")
      : undefined;
  },
  disabled: ({ activeCollectionId, isMenu, stores }) => {
    if (!isMenu || !activeCollectionId) {
      return false;
    }

    return !!stores.collections.get(activeCollectionId)?.isSubscribed;
  },
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }

    const document = stores.documents.get(activeDocumentId);

    return (
      !!document?.isActive &&
      (!!document?.collection?.isSubscribed ||
        (!!document?.isSubscribed &&
          stores.policies.abilities(activeDocumentId).unsubscribe))
    );
  },
  perform: async ({ activeDocumentId, stores, currentUserId, t }) => {
    if (!activeDocumentId || !currentUserId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);

    await document?.unsubscribe();

    toast.success(t("Unsubscribed from document notifications"));
  },
});

export const shareDocument = createAction({
  name: ({ t }) => `${t("Permissions")}…`,
  analyticsName: "Share document",
  section: ActiveDocumentSection,
  icon: <PadlockIcon />,
  visible: ({ stores, activeDocumentId }) => {
    const can = stores.policies.abilities(activeDocumentId!);
    return can.manageUsers || can.share;
  },
  perform: async ({ activeDocumentId, stores, currentUserId, t }) => {
    if (!activeDocumentId || !currentUserId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Share this document"),
      content: (
        <SharePopover
          document={document}
          onRequestClose={stores.dialogs.closeAllModals}
          visible
        />
      ),
    });
  },
});

export const downloadDocument = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Download") : t("Download document")),
  analyticsName: "Download document",
  section: ActiveDocumentSection,
  icon: <DownloadIcon />,
  keywords: "export md markdown html",
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: ({ activeDocumentId, t, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    invariant(document, "Document must exist");

    stores.dialogs.openModal({
      title: t("Download document"),
      content: (
        <DocumentDownload
          document={document}
          onSubmit={stores.dialogs.closeAllModals}
        />
      ),
    });
  },
});

export const downloadDocumentAsMarkdown = createAction({
  name: ({ t }) => t("Downloas as Markdown"),
  analyticsName: "Download document as Markdown",
  section: ActiveDocumentSection,
  keywords: "md markdown export",
  icon: <DownloadIcon />,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.download({
      contentType: ExportContentType.Markdown,
      includeChildDocuments: false,
    });
  },
});

export const downloadDocumentAsHTML = createAction({
  name: ({ t }) => t("Download as HTML"),
  analyticsName: "Download document as HTML",
  section: ActiveDocumentSection,
  keywords: "xml html export",
  icon: <DownloadIcon />,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.download({
      contentType: ExportContentType.Html,
      includeChildDocuments: false,
    });
  },
});

export const downloadDocumentAsPDF = createAction({
  name: ({ t }) => t("Download as PDF"),
  analyticsName: "Download document as PDF",
  section: ActiveDocumentSection,
  keywords: "pdf export",
  icon: <DownloadIcon />,
  visible: ({ activeDocumentId, stores }) =>
    !!(
      activeDocumentId &&
      stores.policies.abilities(activeDocumentId).download &&
      env.PDF_EXPORT_ENABLED
    ),
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.download({
      contentType: ExportContentType.Pdf,
      includeChildDocuments: false,
    });
  },
});

export const copyDocumentAsMarkdown = createAction({
  name: ({ t }) => t("Copy as Markdown"),
  section: ActiveDocumentSection,
  keywords: "clipboard",
  icon: <MarkdownIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ stores, activeDocumentId, t }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (document) {
      const res = await client.post("/documents.export", {
        id: document.id,
        signedUrls: Week.seconds, // 7 days (AWS S3 max for presigned URLs)
      });
      copy(res.data);
      toast.success(t("Markdown copied to clipboard"));
    }
  },
});

export const copyDocumentAsPlainText = createAction({
  name: ({ t }) => t("Copy as text"),
  section: ActiveDocumentSection,
  keywords: "clipboard",
  icon: <CaseSensitiveIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ stores, activeDocumentId, t }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (document) {
      const { ProsemirrorHelper } =
        await import("~/models/helpers/ProsemirrorHelper");
      copy(ProsemirrorHelper.toPlainText(document));
      toast.success(t("Text copied to clipboard"));
    }
  },
});

export const copyDocumentShareLink = createAction({
  name: ({ t }) => t("Copy public link"),
  section: ActiveDocumentSection,
  keywords: "clipboard share",
  icon: <GlobeIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId &&
    !!stores.shares.getByDocumentId(activeDocumentId)?.published,
  perform: ({ stores, activeDocumentId, t }) => {
    if (!activeDocumentId) {
      return;
    }
    const share = stores.shares.getByDocumentId(activeDocumentId);
    if (share) {
      copy(share.url);
      toast.success(t("Link copied to clipboard"));
    }
  },
});

export const copyDocumentLink = createAction({
  name: ({ t }) => t("Copy link"),
  section: ActiveDocumentSection,
  keywords: "clipboard",
  icon: <CopyIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId }) => !!activeDocumentId,
  perform: ({ stores, activeDocumentId, t }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (document) {
      copy(urlify(documentPath(document)));
      toast.success(t("Link copied to clipboard"));
    }
  },
});

export const copyDocument = createActionWithChildren({
  name: ({ t }) => t("Copy"),
  analyticsName: "Copy document",
  section: ActiveDocumentSection,
  icon: <CopyIcon />,
  keywords: "clipboard",
  children: [
    copyDocumentLink,
    copyDocumentShareLink,
    copyDocumentAsMarkdown,
    copyDocumentAsPlainText,
  ],
});

export const duplicateDocument = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Duplicate") : t("Duplicate document")),
  analyticsName: "Duplicate document",
  section: ActiveDocumentSection,
  icon: <DuplicateIcon />,
  keywords: "copy",
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).duplicate,
  perform: async ({ activeDocumentId, t, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    invariant(document, "Document must exist");

    stores.dialogs.openModal({
      title: t("Copy document"),
      content: (
        <DocumentCopy
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
  section: ActiveDocumentSection,
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
      toast.success(t("Pinned to collection"));
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
  section: ActiveDocumentSection,
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
      toast.success(t("Pinned to home"));
    }
  },
});

export const pinDocument = createActionWithChildren({
  name: ({ t }) => t("Pin"),
  analyticsName: "Pin document",
  section: ActiveDocumentSection,
  icon: <PinIcon />,
  children: [pinDocumentToCollection, pinDocumentToHome],
});

export const searchInDocument = createInternalLinkAction({
  name: ({ t }) => t("Search in document"),
  analyticsName: "Search document",
  section: ActiveDocumentSection,
  shortcut: [`Meta+/`],
  icon: <SearchIcon />,
  visible: ({ stores, activeDocumentId }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    return !!document?.isActive;
  },
  to: ({ activeDocumentId, sidebarContext }) => {
    if (!activeDocumentId) {
      return "";
    }

    const [pathname, search] = searchPath({
      documentId: activeDocumentId,
    }).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const printDocument = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Print") : t("Print document")),
  analyticsName: "Print document",
  section: ActiveDocumentSection,
  icon: <PrintIcon />,
  visible: ({ activeDocumentId }) => !!(activeDocumentId && window.print),
  perform: () => {
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
      return !!stores.policies.abilities(activeCollectionId).createDocument;
    }

    return false;
  },
  perform: ({ activeDocumentId, activeCollectionId, stores }) => {
    const { documents } = stores;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = documents.importFileTypesString;

    input.onchange = async (ev) => {
      const files = getEventFiles(ev);
      const file = files[0];

      try {
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
      }
    };

    input.click();
  },
});

export const createTemplateFromDocument = createAction({
  name: ({ t }) => t("Templatize"),
  analyticsName: "Templatize document",
  section: ActiveDocumentSection,
  icon: <ShapesIcon />,
  keywords: "new create template",
  visible: ({ activeCollectionId, activeDocumentId, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (document?.isTemplate || !document?.isActive) {
      return false;
    }
    return !!(
      !!activeCollectionId &&
      stores.policies.abilities(activeCollectionId).updateDocument
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
    const nodes = stores.collections.navigationNodes
      .reduce((acc, node) => [...acc, ...node.children], [] as NavigationNode[])
      .filter((node) => node.id !== activeDocumentId);

    const random = nodes[Math.round(Math.random() * nodes.length)];

    if (random) {
      history.push(random.url);
    }
  },
});

export const searchDocumentsForQuery = (query: string) =>
  createInternalLinkAction({
    id: "search",
    name: ({ t }) =>
      t(`Search documents for "{{searchQuery}}"`, { searchQuery: query }),
    analyticsName: "Search documents",
    section: DocumentSection,
    icon: <SearchIcon />,
    to: searchPath({ query }),
    visible: ({ location }) => location.pathname !== searchPath(),
  });

export const moveTemplateToWorkspace = createAction({
  name: ({ t }) => t("Move to workspace"),
  analyticsName: "Move template to workspace",
  section: DocumentSection,
  icon: <MoveIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    if (!document || !document.template || document.isWorkspaceTemplate) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).move;
  },
  perform: async ({ activeDocumentId, stores }) => {
    if (activeDocumentId) {
      const document = stores.documents.get(activeDocumentId);
      if (!document) {
        return;
      }

      await document.move({
        collectionId: null,
      });
    }
  },
});

export const moveDocumentToCollection = createAction({
  name: ({ activeDocumentId, stores, t }) => {
    if (!activeDocumentId) {
      return t("Move");
    }
    const document = stores.documents.get(activeDocumentId);
    return document?.template && document?.collectionId
      ? t("Move to collection")
      : t("Move");
  },
  analyticsName: "Move document",
  section: ActiveDocumentSection,
  icon: <MoveIcon />,
  iconInContextMenu: false,
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
        content: <DocumentMove document={document} />,
      });
    }
  },
});

export const moveDocument = createAction({
  name: ({ t }) => t("Move"),
  analyticsName: "Move document",
  section: ActiveDocumentSection,
  icon: <MoveIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    // Don't show the button if this is a non-workspace template.
    if (!document || (document.template && !document.isWorkspaceTemplate)) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).move;
  },
  perform: moveDocumentToCollection.perform,
});

export const moveTemplate = createActionWithChildren({
  name: ({ t }) => t("Move"),
  analyticsName: "Move document",
  section: ActiveDocumentSection,
  icon: <MoveIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    // Don't show the menu if this is not a template (or) a workspace template.
    if (!document || !document.template || document.isWorkspaceTemplate) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).move;
  },
  children: [moveTemplateToWorkspace, moveDocumentToCollection],
});

export const archiveDocument = createAction({
  name: ({ t }) => `${t("Archive")}…`,
  analyticsName: "Archive document",
  section: ActiveDocumentSection,
  icon: <ArchiveIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).archive;
  },
  perform: async ({ activeDocumentId, stores, t }) => {
    const { dialogs, documents } = stores;

    if (activeDocumentId) {
      const document = documents.get(activeDocumentId);
      if (!document) {
        return;
      }

      dialogs.openModal({
        title: t("Are you sure you want to archive this document?"),
        content: (
          <ConfirmationDialog
            onSubmit={async () => {
              await document.archive();
              toast.success(t("Document archived"));
            }}
            savingText={`${t("Archiving")}…`}
          >
            {t(
              "Archiving this document will remove it from the collection and search results."
            )}
          </ConfirmationDialog>
        ),
      });
    }
  },
});

export const restoreDocument = createAction({
  name: ({ t }) => `${t("Restore")}`,
  analyticsName: "Restore document",
  section: ActiveDocumentSection,
  icon: <RestoreIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return false;
    }

    const collection = document.collectionId
      ? stores.collections.get(document.collectionId)
      : undefined;
    const can = stores.policies.abilities(document.id);

    return (
      !!(document.isWorkspaceTemplate || collection?.isActive) &&
      !!(can.restore || can.unarchive)
    );
  },
  perform: async ({ t, stores, activeDocumentId }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return;
    }

    await document.restore();
    toast.success(
      t("{{ documentName }} restored", {
        documentName: capitalize(document.noun),
      })
    );
  },
});

export const restoreDocumentToCollection = createActionWithChildren({
  name: ({ t }) => `${t("Restore")}…`,
  analyticsName: "Restore document",
  section: ActiveDocumentSection,
  icon: <RestoreIcon />,
  visible: ({ stores, activeDocumentId }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return false;
    }

    const can = stores.policies.abilities(document.id);
    const collection = document.collectionId
      ? stores.collections.get(document.collectionId)
      : undefined;

    return (
      !(document.isWorkspaceTemplate || collection?.isActive) &&
      !!(can.restore || can.unarchive)
    );
  },
  children: ({ t, activeDocumentId, stores }) => {
    const { collections, documents, policies } = stores;

    const document = activeDocumentId
      ? documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return [];
    }

    const actions = collections.orderedData.map((collection) => {
      const can = policies.abilities(collection.id);
      return createAction({
        name: collection.name,
        section: ActiveDocumentSection,
        icon: <CollectionIcon collection={collection} />,
        visible: can.createDocument,
        perform: async () => {
          await document.restore({ collectionId: collection.id });
          toast.success(
            t("{{ documentName }} restored", {
              documentName: capitalize(document.noun),
            })
          );
        },
      });
    });

    return [createActionGroup({ name: t("Choose a collection"), actions })];
  },
});

export const deleteDocument = createAction({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Delete document",
  section: ActiveDocumentSection,
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
  section: ActiveDocumentSection,
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

export const permanentlyDeleteDocumentsInTrash = createAction({
  name: ({ t }) => t("Empty trash"),
  analyticsName: "Empty trash",
  section: TrashSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: ({ stores }) =>
    stores.documents.deleted.length > 0 && !!stores.auth.user?.isAdmin,
  perform: ({ stores, t, location }) => {
    stores.dialogs.openModal({
      title: t("Permanently delete documents in trash"),
      content: (
        <DeleteDocumentsInTrash
          onSubmit={stores.dialogs.closeAllModals}
          shouldRedirect={location.pathname === trashPath()}
        />
      ),
    });
  },
});

export const openDocumentComments = createAction({
  name: ({ t }) => t("Comments"),
  analyticsName: "Open comments",
  section: ActiveDocumentSection,
  icon: <CommentIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");

    return (
      !!activeDocumentId &&
      can.comment &&
      !!stores.auth.team?.getPreference(TeamPreference.Commenting)
    );
  },
  perform: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    stores.ui.toggleComments();
  },
});

export const openDocumentHistory = createInternalLinkAction({
  name: ({ t }) => t("History"),
  analyticsName: "Open document history",
  section: ActiveDocumentSection,
  icon: <HistoryIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");
    return !!activeDocumentId && can.listRevisions;
  },
  to: ({ activeDocumentId, stores, sidebarContext }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return "";
    }

    const [pathname, search] = documentHistoryPath(document).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const openDocumentInsights = createAction({
  name: ({ t }) => t("Insights"),
  analyticsName: "Open document insights",
  section: ActiveDocumentSection,
  icon: <GraphIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;

    return (
      !!activeDocumentId &&
      can.listViews &&
      !document?.isTemplate &&
      !document?.isDeleted
    );
  },
  perform: ({ activeDocumentId, stores, t }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Insights"),
      content: <Insights document={document} />,
    });
  },
});

export const leaveDocument = createAction({
  name: ({ t }) => t("Leave document"),
  analyticsName: "Leave document",
  section: ActiveDocumentSection,
  icon: <LogoutIcon />,
  visible: ({ currentUserId, activeDocumentId, stores }) => {
    const membership = stores.userMemberships.orderedData.find(
      (m) => m.documentId === activeDocumentId && m.userId === currentUserId
    );

    return !!membership;
  },
  perform: async ({ t, location, currentUserId, activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);

    try {
      if (document && location.pathname.startsWith(document.path)) {
        history.push(homePath());
      }

      await stores.userMemberships.delete({
        documentId: activeDocumentId,
        userId: currentUserId,
      } as UserMembership);

      toast.success(t("You have left the shared document"));
    } catch (_err) {
      toast.error(t("Could not leave document"));
    }
  },
});

export const applyTemplateFactory = ({
  actions,
}: {
  actions: (Action | ActionGroup | ActionSeparator)[];
}) =>
  createActionWithChildren({
    name: ({ t }) => t("Apply template"),
    analyticsName: "Apply template",
    section: ActiveDocumentSection,
    icon: <ShapesIcon />,
    visible: ({ activeDocumentId, stores }) => {
      const { policies } = stores;
      const can = activeDocumentId
        ? policies.abilities(activeDocumentId)
        : undefined;

      return !!can?.update;
    },
    children: actions,
  });

export const rootDocumentActions = [
  openDocument,
  archiveDocument,
  createDocument,
  createDraftDocument,
  createNestedDocument,
  createTemplateFromDocument,
  deleteDocument,
  importDocument,
  downloadDocument,
  downloadDocumentAsMarkdown,
  downloadDocumentAsHTML,
  downloadDocumentAsPDF,
  copyDocumentLink,
  copyDocumentShareLink,
  copyDocumentAsMarkdown,
  copyDocumentAsPlainText,
  starDocument,
  unstarDocument,
  publishDocument,
  unpublishDocument,
  subscribeDocument,
  unsubscribeDocument,
  searchInDocument,
  duplicateDocument,
  leaveDocument,
  moveTemplateToWorkspace,
  moveDocumentToCollection,
  openRandomDocument,
  permanentlyDeleteDocument,
  permanentlyDeleteDocumentsInTrash,
  printDocument,
  pinDocumentToCollection,
  pinDocumentToHome,
  openDocumentComments,
  openDocumentHistory,
  openDocumentInsights,
  shareDocument,
];
