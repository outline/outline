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
  EyeIcon,
  PadlockIcon,
  GlobeIcon,
  LogoutIcon,
  CaseSensitiveIcon,
  RestoreIcon,
  EditIcon,
} from "outline-icons";
import { toast } from "sonner";
import Icon from "@shared/components/Icon";
import {
  ExportContentType,
  TeamPreference,
  NavigationNode,
} from "@shared/types";
import { getEventFiles } from "@shared/utils/files";
import UserMembership from "~/models/UserMembership";
import DocumentDelete from "~/scenes/DocumentDelete";
import DocumentMove from "~/scenes/DocumentMove";
import DocumentPermanentDelete from "~/scenes/DocumentPermanentDelete";
import DocumentPublish from "~/scenes/DocumentPublish";
import DeleteDocumentsInTrash from "~/scenes/Trash/components/DeleteDocumentsInTrash";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DocumentCopy from "~/components/DocumentCopy";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import SharePopover from "~/components/Sharing/Document";
import { getHeaderExpandedKey } from "~/components/Sidebar/components/Header";
import DocumentTemplatizeDialog from "~/components/TemplatizeDialog";
import {
  createAction,
  createActionV2,
  createActionV2Group,
  createActionV2WithChildren,
  createInternalLinkActionV2,
} from "~/actions";
import {
  ActiveDocumentSection,
  DocumentSection,
  TrashSection,
} from "~/actions/sections";
import env from "~/env";
import { setPersistedState } from "~/hooks/usePersistedState";
import history from "~/utils/history";
import {
  documentInsightsPath,
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
import { ActionV2, ActionV2Group, ActionV2Separator } from "~/types";

export const openDocument = createAction({
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

    return uniqBy([...documents, ...nodes], "id").map((item) => ({
      // Note: using url which includes the slug rather than id here to bust
      // cache if the document is renamed
      id: item.url,
      name: item.title,
      icon: item.icon ? (
        <Icon value={item.icon} color={item.color ?? undefined} />
      ) : (
        <DocumentIcon />
      ),
      section: DocumentSection,
      to: item.url,
    }));
  },
});

export const editDocument = createInternalLinkActionV2({
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

export const createDocument = createAction({
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
  perform: ({ activeCollectionId, sidebarContext }) =>
    history.push(newDocumentPath(activeCollectionId), {
      sidebarContext,
    }),
});

export const createDraftDocument = createAction({
  name: ({ t }) => t("New draft"),
  analyticsName: "New document",
  section: DocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create document",
  visible: ({ currentTeamId, stores }) =>
    !!currentTeamId && stores.policies.abilities(currentTeamId).createDocument,
  perform: ({ sidebarContext }) =>
    history.push(newDocumentPath(), {
      sidebarContext,
    }),
});

export const createDocumentFromTemplate = createInternalLinkActionV2({
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

export const createNestedDocument = createInternalLinkActionV2({
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

export const starDocument = createActionV2({
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

export const unstarDocument = createActionV2({
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

export const publishDocument = createActionV2({
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

export const unpublishDocument = createActionV2({
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

export const subscribeDocument = createActionV2({
  name: ({ t }) => t("Subscribe"),
  analyticsName: "Subscribe to document",
  section: ActiveDocumentSection,
  icon: <SubscribeIcon />,
  tooltip: ({ activeCollectionId, isContextMenu, stores, t }) => {
    if (!isContextMenu || !activeCollectionId) {
      return undefined;
    }

    return stores.collections.get(activeCollectionId)?.isSubscribed
      ? t("Subscription inherited from collection")
      : undefined;
  },
  disabled: ({ activeCollectionId, isContextMenu, stores }) => {
    if (!isContextMenu || !activeCollectionId) {
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

export const unsubscribeDocument = createActionV2({
  name: ({ t }) => t("Unsubscribe"),
  analyticsName: "Unsubscribe from document",
  section: ActiveDocumentSection,
  icon: <UnsubscribeIcon />,
  tooltip: ({ activeCollectionId, isContextMenu, stores, t }) => {
    if (!isContextMenu || !activeCollectionId) {
      return undefined;
    }

    return stores.collections.get(activeCollectionId)?.isSubscribed
      ? t("Subscription inherited from collection")
      : undefined;
  },
  disabled: ({ activeCollectionId, isContextMenu, stores }) => {
    if (!isContextMenu || !activeCollectionId) {
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

export const shareDocument = createActionV2({
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
      style: { marginBottom: -12 },
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

export const downloadDocumentAsHTML = createActionV2({
  name: ({ t }) => t("HTML"),
  analyticsName: "Download document as HTML",
  section: ActiveDocumentSection,
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

export const downloadDocumentAsPDF = createActionV2({
  name: ({ t }) => t("PDF"),
  analyticsName: "Download document as PDF",
  section: ActiveDocumentSection,
  keywords: "export",
  icon: <DownloadIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!(
      activeDocumentId &&
      stores.policies.abilities(activeDocumentId).download &&
      env.PDF_EXPORT_ENABLED
    ),
  perform: ({ activeDocumentId, t, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const id = toast.loading(`${t("Exporting")}…`);
    const document = stores.documents.get(activeDocumentId);
    return document
      ?.download(ExportContentType.Pdf)
      .finally(() => id && toast.dismiss(id));
  },
});

export const downloadDocumentAsMarkdown = createActionV2({
  name: ({ t }) => t("Markdown"),
  analyticsName: "Download document as Markdown",
  section: ActiveDocumentSection,
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

export const downloadDocument = createActionV2WithChildren({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Download") : t("Download document"),
  analyticsName: "Download document",
  section: ActiveDocumentSection,
  icon: <DownloadIcon />,
  keywords: "export",
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  children: [
    downloadDocumentAsHTML,
    downloadDocumentAsPDF,
    downloadDocumentAsMarkdown,
  ],
});

export const copyDocumentAsMarkdown = createActionV2({
  name: ({ t }) => t("Copy as Markdown"),
  section: ActiveDocumentSection,
  keywords: "clipboard",
  icon: <MarkdownIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: ({ stores, activeDocumentId, t }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (document) {
      copy(document.toMarkdown());
      toast.success(t("Markdown copied to clipboard"));
    }
  },
});

export const copyDocumentAsPlainText = createActionV2({
  name: ({ t }) => t("Copy as text"),
  section: ActiveDocumentSection,
  keywords: "clipboard",
  icon: <CaseSensitiveIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: ({ stores, activeDocumentId, t }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (document) {
      copy(document.toPlainText());
      toast.success(t("Text copied to clipboard"));
    }
  },
});

export const copyDocumentShareLink = createActionV2({
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

export const copyDocumentLink = createActionV2({
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

export const copyDocument = createActionV2WithChildren({
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

export const duplicateDocument = createActionV2({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Duplicate") : t("Duplicate document"),
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
export const pinDocumentToCollection = createActionV2({
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
export const pinDocumentToHome = createActionV2({
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

export const pinDocument = createActionV2WithChildren({
  name: ({ t }) => t("Pin"),
  analyticsName: "Pin document",
  section: ActiveDocumentSection,
  icon: <PinIcon />,
  children: [pinDocumentToCollection, pinDocumentToHome],
});

export const searchInDocument = createInternalLinkActionV2({
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

export const printDocument = createActionV2({
  name: ({ t, isContextMenu }) =>
    isContextMenu ? t("Print") : t("Print document"),
  analyticsName: "Print document",
  section: ActiveDocumentSection,
  icon: <PrintIcon />,
  visible: ({ activeDocumentId }) => !!(activeDocumentId && window.print),
  perform: () => {
    queueMicrotask(window.print);
  },
});

export const importDocument = createActionV2({
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
  perform: ({ activeDocumentId, activeCollectionId, stores }) => {
    const { documents } = stores;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = documents.importFileTypes.join(", ");

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

export const createTemplateFromDocument = createActionV2({
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
  createAction({
    id: "search",
    name: ({ t }) =>
      t(`Search documents for "{{searchQuery}}"`, { searchQuery: query }),
    analyticsName: "Search documents",
    section: DocumentSection,
    icon: <SearchIcon />,
    to: searchPath({ query }),
    visible: ({ location }) => location.pathname !== searchPath(),
  });

export const moveTemplateToWorkspace = createActionV2({
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

export const moveDocumentToCollection = createActionV2({
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

export const moveDocument = createActionV2({
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

export const moveTemplate = createActionV2WithChildren({
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

export const archiveDocument = createActionV2({
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

export const restoreDocument = createActionV2({
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

export const restoreDocumentToCollection = createActionV2WithChildren({
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
      return createActionV2({
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

    return [createActionV2Group({ name: t("Choose a collection"), actions })];
  },
});

export const deleteDocument = createActionV2({
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

export const permanentlyDeleteDocument = createActionV2({
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

export const openDocumentComments = createActionV2({
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

export const openDocumentHistory = createInternalLinkActionV2({
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

export const openDocumentInsights = createInternalLinkActionV2({
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
  to: ({ activeDocumentId, stores, sidebarContext }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return "";
    }

    const [pathname, search] = documentInsightsPath(document).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const toggleViewerInsights = createActionV2({
  name: ({ t, stores, activeDocumentId }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    return document?.insightsEnabled
      ? t("Disable viewer insights")
      : t("Enable viewer insights");
  },
  analyticsName: "Toggle viewer insights",
  section: ActiveDocumentSection,
  icon: <EyeIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");
    return can.updateInsights;
  },
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }
    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }

    await document.save({
      insightsEnabled: !document.insightsEnabled,
    });
  },
});

export const leaveDocument = createActionV2({
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
  actions: (ActionV2 | ActionV2Group | ActionV2Separator)[];
}) =>
  createActionV2WithChildren({
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
