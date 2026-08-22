import copy from "copy-to-clipboard";
import type { TFunction } from "i18next";
import invariant from "invariant";
import { capitalize, uniqBy } from "es-toolkit/compat";
import {
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
  HashtagIcon,
  UnpublishIcon,
  PublishIcon,
  CommentIcon,
  CopyIcon,
  PadlockIcon,
  GlobeIcon,
  LogoutIcon,
  CaseSensitiveIcon,
  OrderedListIcon,
  RestoreIcon,
  EditIcon,
  EmbedIcon,
  OpenIcon,
  SplitIcon,
  ExportIcon,
  CodeIcon,
  PDFIcon,
} from "outline-icons";
import { toast } from "sonner";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import {
  DocumentPreference,
  ExportContentType,
  HeadingPrefixStyle,
  UserPreference,
} from "@shared/types";
import { isMobile } from "@shared/utils/browser";
import { Week } from "@shared/utils/time";
import type UserMembership from "~/models/UserMembership";
import Document from "~/models/Document";
import { client } from "~/utils/ApiClient";
import DocumentDelete from "~/scenes/DocumentDelete";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import DocumentPermanentDelete from "~/scenes/DocumentPermanentDelete";
import DocumentPublish from "~/scenes/DocumentPublish";
import DeleteDocumentsInTrash from "~/scenes/Trash/components/DeleteDocumentsInTrash";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { DialogTitle } from "~/components/DialogTitle";
import DocumentCopy from "~/components/DocumentExplorer/DocumentCopy";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import { ImportDocumentDialog } from "~/components/ImportDocumentDialog";
import { getHeaderExpandedKey } from "~/components/Sidebar/components/Header";
import DocumentTemplatizeDialog from "~/components/TemplatizeDialog";
import {
  ActionSeparator,
  createAction,
  createActionGroup,
  createActionWithChildren,
  createInternalLinkAction,
} from "~/actions";
import {
  dialogActionFactory,
  everyActiveModel,
  performBatch,
  performBatchOnActiveModels,
} from "~/actions/definitions/common";
import {
  ActiveDocumentSection,
  DocumentSection,
  SearchResultsSection,
  TrashSection,
} from "~/actions/sections";
import { setPersistedState } from "~/hooks/usePersistedState";
import history from "~/utils/history";
import {
  documentHistoryPath,
  homePath,
  newDocumentPath,
  newNestedDocumentPath,
  newSiblingDocumentPath,
  searchPath,
  documentPath,
  urlify,
  desktopify,
  trashPath,
  documentEditPath,
} from "~/utils/routeHelpers";
import { getFocusedSplitPane, openRouteInSplit } from "~/utils/splitView";
import { recentDocuments } from "~/components/CommandBar/useRecentDocumentActions";
import { documentBreadcrumbText } from "~/components/DocumentBreadcrumb";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import type {
  Action,
  ActionContext,
  ActionGroup,
  ActionSeparator as TActionSeparator,
} from "~/types";
import lazyWithRetry from "~/utils/lazyWithRetry";
import env from "~/env";
import { isMac, isWindows } from "@shared/utils/browser";
import isCloudHosted from "~/utils/isCloudHosted";
import DocumentMove from "~/components/DocumentExplorer/DocumentMove";

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
  children: ({ stores, activeDocumentId, t }) => {
    const nodes = stores.collections.navigationNodes.reduce(
      (acc, node) => [...acc, ...node.children],
      [] as NavigationNode[]
    );
    const documents = stores.documents.orderedData;

    // Documents already listed under "Recently viewed" are skipped so that they
    // do not appear twice in the command bar.
    const recentIds = new Set(
      recentDocuments(stores.documents.recentlyViewed, activeDocumentId).map(
        (document) => document.id
      )
    );

    return uniqBy([...documents, ...nodes], "id")
      .filter((item) => !recentIds.has(item.id))
      .map((item) => {
        const document = stores.documents.get(item.id);
        return createInternalLinkAction({
          // Note: using url which includes the slug rather than id here to bust
          // cache if the document is renamed
          id: item.url,
          name: item.title,
          description: document
            ? documentBreadcrumbText(document, t)
            : undefined,
          icon: item.icon ? (
            <Icon
              value={item.icon}
              initial={item.title}
              color={item.color ?? undefined}
            />
          ) : (
            <DocumentIcon outline={item.isDraft} />
          ),
          section: DocumentSection,
          to: item.url,
        });
      });
  },
});

export const editDocument = createInternalLinkAction({
  name: ({ t }) => t("Edit"),
  analyticsName: "Edit document",
  section: ActiveDocumentSection,
  keywords: "edit",
  icon: <EditIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const { auth, policies } = stores;

    const can = activeDocumentId
      ? policies.abilities(activeDocumentId)
      : undefined;

    return !!can?.update && !!auth.user?.separateEditMode;
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

/**
 * Finds the index of a document among its siblings in the collection tree.
 *
 * @param stores - the root stores.
 * @param document - the document to find the index of.
 * @returns the index of the document among its siblings, or -1 if not found.
 */
function findDocumentSiblingIndex(
  stores: ActionContext["stores"],
  document: {
    id: string;
    collectionId?: string | null;
    parentDocumentId?: string;
  }
): number {
  if (!document.collectionId) {
    return -1;
  }
  const collection = stores.collections.get(document.collectionId);
  if (!collection) {
    return -1;
  }

  const siblings = document.parentDocumentId
    ? collection.getChildrenForDocument(document.parentDocumentId)
    : collection.sortedDocuments;

  return siblings?.findIndex((node) => node.id === document.id) ?? -1;
}

/**
 * Determines whether the user can create a sibling of the given document.
 * A sibling shares the document's parent, so this mirrors the backend's
 * create authorization: create permission on the parent document, or on the
 * collection when the document is at the root.
 *
 * @param stores - the root stores.
 * @param document - the document to create a sibling of.
 * @returns true if the user can create a sibling.
 */
function canCreateSiblingDocument(
  stores: ActionContext["stores"],
  document: Document
): boolean {
  if (document.isDeleted) {
    return false;
  }

  return document.parentDocumentId
    ? stores.policies.abilities(document.parentDocumentId).createChildDocument
    : !!document.collectionId &&
        stores.policies.abilities(document.collectionId).createDocument;
}

export const createNestedDocument = createInternalLinkAction({
  name: ({ t }) => t("Nested document"),
  analyticsName: "New document",
  section: ActiveDocumentSection,
  keywords: "create nested",
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

const createDocumentBefore = createInternalLinkAction({
  name: ({ t }) => t("Before"),
  analyticsName: "New document before",
  section: ActiveDocumentSection,
  keywords: "create before",
  visible: ({ currentTeamId, activeDocumentId, stores }) => {
    if (!currentTeamId || !activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    if (!document?.collectionId) {
      return false;
    }
    const collection = stores.collections.get(document.collectionId);
    if (collection?.sort.field === "title") {
      return false;
    }
    return canCreateSiblingDocument(stores, document);
  },
  to: ({ activeDocumentId, stores, sidebarContext }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return "";
    }

    const index = findDocumentSiblingIndex(stores, document);
    const [pathname, search] = newSiblingDocumentPath({
      collectionId: document.collectionId,
      parentDocumentId: document.parentDocumentId,
      index: Math.max(0, index),
    }).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

const createDocumentAfter = createInternalLinkAction({
  name: ({ t }) => t("After"),
  analyticsName: "New document after",
  section: ActiveDocumentSection,
  keywords: "create after",
  visible: ({ currentTeamId, activeDocumentId, stores }) => {
    if (!currentTeamId || !activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    if (!document?.collectionId) {
      return false;
    }
    const collection = stores.collections.get(document.collectionId);
    if (collection?.sort.field === "title") {
      return false;
    }
    return canCreateSiblingDocument(stores, document);
  },
  to: ({ activeDocumentId, stores, sidebarContext }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return "";
    }

    const index = findDocumentSiblingIndex(stores, document);
    const [pathname, search] = newSiblingDocumentPath({
      collectionId: document.collectionId,
      parentDocumentId: document.parentDocumentId,
      index: index + 1,
    }).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

function isAlphabeticallySorted(
  stores: ActionContext["stores"],
  activeDocumentId: string
): boolean {
  const document = stores.documents.get(activeDocumentId);
  if (!document?.collectionId) {
    return false;
  }
  const collection = stores.collections.get(document.collectionId);
  return collection?.sort.field === "title";
}

export const createNewDocument = createActionWithChildren({
  name: ({ t }) => t("New document"),
  analyticsName: "New document",
  section: ActiveDocumentSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, activeDocumentId, stores }) => {
    if (!activeDocumentId || !currentTeamId) {
      return false;
    }
    if (!stores.policies.abilities(currentTeamId).createDocument) {
      return false;
    }
    if (stores.documents.get(activeDocumentId)?.isDeleted) {
      return false;
    }
    return !isAlphabeticallySorted(stores, activeDocumentId);
  },
  children: [createDocumentBefore, createDocumentAfter, createNestedDocument],
});

export const createNewDocumentInAlphabeticalCollection =
  createInternalLinkAction({
    name: ({ t }) => t("New document"),
    analyticsName: "New document",
    section: ActiveDocumentSection,
    icon: <NewDocumentIcon />,
    keywords: "create",
    visible: ({ currentTeamId, activeDocumentId, stores }) => {
      if (!activeDocumentId || !currentTeamId) {
        return false;
      }
      if (!stores.policies.abilities(currentTeamId).createDocument) {
        return false;
      }
      if (!stores.policies.abilities(activeDocumentId).createChildDocument) {
        return false;
      }
      return isAlphabeticallySorted(stores, activeDocumentId);
    },
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
  visible: (context) =>
    everyActiveModel(
      context,
      Document,
      (document) =>
        !document.isStarred &&
        !document.isDeleted &&
        context.stores.policies.abilities(document.id).star
    ),
  perform: async (context) => {
    await performBatchOnActiveModels(
      context,
      Document,
      (document) => document.star(),
      (documents, succeeded, t) =>
        documents.length > 1
          ? t("{{ count }} documents starred", { count: succeeded })
          : undefined
    );
    setPersistedState(getHeaderExpandedKey("starred"), true);
  },
});

export const unstarDocument = createAction({
  name: ({ t }) => t("Unstar"),
  analyticsName: "Unstar document",
  section: ActiveDocumentSection,
  icon: <UnstarredIcon />,
  keywords: "unfavorite unbookmark",
  visible: (context) =>
    everyActiveModel(
      context,
      Document,
      (document) =>
        document.isStarred &&
        context.stores.policies.abilities(document.id).unstar
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Document,
      (document) => document.unstar(),
      (documents, succeeded, t) =>
        documents.length > 1
          ? t("{{ count }} documents unstarred", { count: succeeded })
          : undefined
    ),
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
        title: <DialogTitle title={t("Publish document")} model={document} />,
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
  visible: (context) =>
    everyActiveModel(
      context,
      Document,
      (document) => !!context.stores.policies.abilities(document.id).unpublish
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Document,
      (document) => document.unpublish(),
      (documents, succeeded, t) =>
        documents.length === 1
          ? t("Unpublished {{ documentName }}", {
              documentName: documents[0].noun,
            })
          : t("{{ count }} documents unpublished", { count: succeeded })
    ),
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
    if (!activeDocumentId) {
      return false;
    }
    const can = stores.policies.abilities(activeDocumentId);
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
      title: <DialogTitle title={t("Share document")} model={document} />,
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

export const downloadDocumentAsMarkdown = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Markdown") : t("Download as Markdown")),
  analyticsName: "Download document as Markdown",
  section: ActiveDocumentSection,
  keywords: "md markdown export download",
  icon: <MarkdownIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.download({
      contentType: ExportContentType.Markdown,
    });
  },
});

export const downloadDocumentAsHTML = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("HTML") : t("Download as HTML")),
  analyticsName: "Download document as HTML",
  section: ActiveDocumentSection,
  keywords: "xml html export download",
  icon: <CodeIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.download({
      contentType: ExportContentType.Html,
    });
  },
});

export const downloadDocumentAsTextBundle = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? t("TextBundle") : t("Download as TextBundle"),
  analyticsName: "Download document as TextBundle",
  section: ActiveDocumentSection,
  keywords: "textbundle textpack bear ulysses export download",
  icon: <ArchiveIcon />,
  iconInContextMenu: false,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).download,
  perform: async ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    await document?.download({
      contentType: ExportContentType.TextBundle,
    });
  },
});

export const downloadDocumentAsPDF = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("PDF") : t("Download as PDF")),
  analyticsName: "Download document as PDF",
  section: ActiveDocumentSection,
  keywords: "pdf export download",
  icon: <PDFIcon />,
  iconInContextMenu: false,
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
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Duplicate")}…` : t("Duplicate document"),
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
      title: <DialogTitle title={t("Duplicate document")} model={document} />,
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

function pinToCollectionName({ getActiveModels, t, stores }: ActionContext) {
  const documents = getActiveModels(Document);
  if (documents.length === 1) {
    const collectionName = stores.documents.getCollectionForDocument(
      documents[0]
    )?.name;
    return t("Pin to {{collectionName}}", {
      collectionName: collectionName ?? t("collection"),
    });
  }
  return t("Pin");
}

/**
 * Pin a document to a collection. Pinned documents will be displayed at the top
 * of the collection for all collection members to see.
 */
export const pinDocumentToCollection = createAction({
  name: pinToCollectionName,
  analyticsName: "Pin document to collection",
  section: ActiveDocumentSection,
  icon: <PinIcon />,
  iconInContextMenu: false,
  visible: (context) =>
    everyActiveModel(
      context,
      Document,
      (document) =>
        !!document.collectionId &&
        !document.pinned &&
        !!context.stores.policies.abilities(document.id).pin
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Document,
      (document) => document.pin(document.collectionId),
      (documents, succeeded, t) =>
        documents.length === 1
          ? t("Pinned to collection")
          : t("{{ count }} documents pinned", { count: succeeded })
    ),
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

export const unpinDocument = createAction({
  name: ({ t }) => t("Unpin"),
  analyticsName: "Unpin document",
  section: ActiveDocumentSection,
  icon: <PinIcon />,
  visible: (context) =>
    everyActiveModel(
      context,
      Document,
      (document) =>
        document.pinned &&
        !!context.stores.policies.abilities(document.id).unpin
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Document,
      (document) => document.unpin(document.collectionId ?? undefined),
      (documents, succeeded, t) =>
        documents.length === 1
          ? t("Unpinned")
          : t("{{ count }} documents unpinned", { count: succeeded })
    ),
});

const allPinnedToCollection = (context: ActionContext) =>
  everyActiveModel(context, Document, (document) => document.pinned);

const nonePinnedToCollection = (context: ActionContext) =>
  everyActiveModel(context, Document, (document) => !document.pinned);

/**
 * Toggle whether a document is pinned to its collection, the current state is
 * reflected in the item so the label does not change between the two.
 */
export const togglePinDocumentToCollection = createAction({
  name: pinToCollectionName,
  analyticsName: "Toggle pin document to collection",
  section: ActiveDocumentSection,
  icon: <PinIcon />,
  iconInContextMenu: false,
  selected: allPinnedToCollection,
  visible: (context) =>
    // A mixed selection has no single state to toggle to, the one-way Pin and
    // Unpin actions cover that case instead.
    (allPinnedToCollection(context) || nonePinnedToCollection(context)) &&
    everyActiveModel(context, Document, (document) => {
      const can = context.stores.policies.abilities(document.id);
      return !!document.collectionId && (document.pinned ? can.unpin : can.pin);
    }),
  perform: (context) =>
    allPinnedToCollection(context)
      ? unpinDocument.perform(context)
      : pinDocumentToCollection.perform(context),
});

/**
 * Toggle whether a document is pinned to team home, the current state is
 * reflected in the item so the label does not change between the two.
 */
export const togglePinDocumentToHome = createAction({
  name: ({ t }) => t("Pin to home"),
  analyticsName: "Toggle pin document to home",
  section: ActiveDocumentSection,
  icon: <PinIcon />,
  iconInContextMenu: false,
  selected: ({ activeDocumentId, stores }) =>
    !!activeDocumentId &&
    !!stores.documents.get(activeDocumentId)?.pinnedToHome,
  visible: ({ activeDocumentId, currentTeamId, stores }) =>
    !!currentTeamId &&
    !!activeDocumentId &&
    !!stores.policies.abilities(activeDocumentId).pinToHome,
  perform: async (context) => {
    const { activeDocumentId, location, t, stores } = context;
    if (!activeDocumentId) {
      return;
    }
    const document = stores.documents.get(activeDocumentId);

    if (!document?.pinnedToHome) {
      await pinDocumentToHome.perform(context);
      return;
    }

    await document.unpin();

    if (location.pathname !== homePath()) {
      toast.success(t("Unpinned"));
    }
  },
});

export const pinDocument = createActionWithChildren({
  name: ({ t }) => t("Pin"),
  analyticsName: "Pin document",
  section: ActiveDocumentSection,
  icon: <PinIcon />,
  children: [togglePinDocumentToCollection, togglePinDocumentToHome],
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
  iconInContextMenu: false,
  visible: ({ activeDocumentId }) => !!(activeDocumentId && window.print),
  perform: () => {
    setTimeout(window.print, 0);
  },
});

export const exportDocument = createActionWithChildren({
  name: ({ t, isMenu }) => (isMenu ? t("Export") : t("Export document")),
  analyticsName: "Export document",
  section: ActiveDocumentSection,
  icon: <ExportIcon />,
  keywords: "download print pdf markdown html",
  children: [
    downloadDocumentAsMarkdown,
    downloadDocumentAsHTML,
    downloadDocumentAsTextBundle,
    downloadDocumentAsPDF,
    ActionSeparator,
    printDocument,
  ],
});

export const openDocumentInDesktop = createAction({
  name: ({ t }) => t("Open in desktop app"),
  analyticsName: "Open in desktop",
  section: ActiveDocumentSection,
  icon: <OpenIcon />,
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId) {
      return false;
    }
    const document = stores.documents.get(activeDocumentId);
    return (
      isCloudHosted &&
      (isMac || isWindows) &&
      !!document &&
      !document.isDeleted &&
      !isMobile()
    );
  },
  perform: ({ activeDocumentId, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (document) {
      window.location.href = desktopify(documentPath(document));
    }
  },
});

export const openDocumentInSplit = createAction({
  name: ({ t }) => t("Open in split view"),
  analyticsName: "Open document in split view",
  section: ActiveDocumentSection,
  icon: <SplitIcon />,
  keywords: "split side pane",
  visible: ({ activeDocumentId, stores }) => {
    if (!activeDocumentId || isMobile()) {
      return false;
    }
    return !!stores.documents.get(activeDocumentId);
  },
  perform: ({ activeDocumentId, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (document) {
      openRouteInSplit(history, documentPath(document));
    }
  },
});

export const presentDocument = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Present") : t("Present document")),
  analyticsName: "Present document",
  section: ActiveDocumentSection,
  icon: <EmbedIcon />,
  shortcut: ["Control+Alt+KeyP"],
  visible: ({ activeDocumentId }) => !!activeDocumentId && !isMobile(),
  perform: ({ activeDocumentId, stores }) => {
    if (stores.ui.presentationData) {
      stores.ui.setPresentingDocument(null);
      return;
    }

    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return;
    }

    stores.ui.setPresentingDocument(document);
  },
});

/**
 * Returns the document or collection that an import will be nested inside.
 *
 * @param context - the action context.
 * @returns the parent model, if it is loaded.
 */
function getImportParent({
  activeDocumentId,
  activeCollectionId,
  stores,
}: ActionContext) {
  if (activeDocumentId) {
    return stores.documents.get(activeDocumentId);
  }
  return activeCollectionId
    ? stores.collections.get(activeCollectionId)
    : undefined;
}

export const importDocument = dialogActionFactory({
  analyticsName: "Import document",
  section: DocumentSection,
  width: "640px",
  icon: <ImportIcon />,
  keywords: "upload",
  name: (t) => `${t("Import documents")}…`,
  title: (t, context) => (
    <DialogTitle
      title={t("Import documents")}
      model={getImportParent(context)}
    />
  ),
  content: (onSubmit, { activeDocumentId, activeCollectionId }) => (
    <ImportDocumentDialog
      documentId={activeDocumentId}
      collectionId={activeCollectionId}
      onSubmit={onSubmit}
    />
  ),
  visible: ({ activeCollectionId, activeDocumentId, stores }) => {
    if (activeDocumentId) {
      return !!stores.policies.abilities(activeDocumentId).createChildDocument;
    }

    if (activeCollectionId) {
      return !!stores.policies.abilities(activeCollectionId).createDocument;
    }

    return false;
  },
});

export const createTemplateFromDocument = createAction({
  name: ({ t }) => `${t("Templatize")}…`,
  analyticsName: "Templatize document",
  section: ActiveDocumentSection,
  icon: <ShapesIcon />,
  keywords: "new create template",
  visible: ({ activeCollectionId, activeDocumentId, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document?.isActive) {
      return false;
    }
    return !!(
      !!activeCollectionId &&
      stores.policies.abilities(activeCollectionId).createTemplate
    );
  },
  perform: ({ activeDocumentId, stores, t, event }) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!activeDocumentId) {
      return;
    }
    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Create template")} model={document} />,
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

export const searchDocumentsForQueryActionFactory = (query: string) =>
  createInternalLinkAction({
    id: "search",
    name: ({ t }) =>
      t(`Search documents for "{{searchQuery}}"`, { searchQuery: query }),
    analyticsName: "Search documents",
    section: SearchResultsSection,
    priority: -1,
    icon: <SearchIcon />,
    to: searchPath({ query }),
    visible: ({ location }) => location.pathname !== searchPath(),
  });

export const moveDocumentToCollection = createAction({
  name: ({ t }) => t("Move"),
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
        title: (
          <DialogTitle
            title={t("Move {{ documentType }}", {
              documentType: document.noun,
            })}
            model={document}
          />
        ),
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
    if (!document) {
      return false;
    }
    return !!stores.policies.abilities(activeDocumentId).move;
  },
  perform: moveDocumentToCollection.perform,
});

export const archiveDocument = createAction({
  name: ({ t }) => `${t("Archive")}…`,
  analyticsName: "Archive document",
  section: ActiveDocumentSection,
  icon: <ArchiveIcon />,
  visible: (context) =>
    everyActiveModel(
      context,
      Document,
      (document) => !!context.stores.policies.abilities(document.id).archive
    ),
  perform: async ({ getActiveModels, stores, t }) => {
    const documents = getActiveModels(Document);
    if (!documents.length) {
      return;
    }

    stores.dialogs.openModal({
      title:
        documents.length === 1 ? (
          <DialogTitle
            title={t("Are you sure you want to archive this document?")}
            model={documents[0]}
          />
        ) : (
          t("Are you sure you want to archive {{ count }} documents?", {
            count: documents.length,
          })
        ),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            const succeeded = await performBatch(documents, (document) =>
              document.archive()
            );
            if (succeeded) {
              toast.success(
                documents.length === 1
                  ? t("Document archived")
                  : t("{{ count }} documents archived", { count: succeeded })
              );
            }
          }}
          savingText={`${t("Archiving")}…`}
        >
          {documents.length === 1
            ? t(
                "Archiving this document will remove it from the collection and search results."
              )
            : t(
                "Archiving these documents will remove them from their collections and search results."
              )}
        </ConfirmationDialog>
      ),
    });
  },
});

export const restoreDocument = createAction({
  name: ({ t }) => `${t("Restore")}`,
  analyticsName: "Restore document",
  section: ActiveDocumentSection,
  icon: <RestoreIcon />,
  visible: (context) =>
    everyActiveModel(context, Document, (document) => {
      const collection = document.collectionId
        ? context.stores.collections.get(document.collectionId)
        : undefined;
      const can = context.stores.policies.abilities(document.id);
      return !!collection?.isActive && !!(can.restore || can.unarchive);
    }),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Document,
      (document) => document.restore(),
      (documents, succeeded, t) =>
        documents.length === 1
          ? t("{{ documentName }} restored", {
              documentName: capitalize(documents[0].noun),
            })
          : t("{{ count }} documents restored", { count: succeeded })
    ),
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

    return !collection?.isActive && !!(can.restore || can.unarchive);
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
  visible: (context) =>
    everyActiveModel(
      context,
      Document,
      (document) => !!context.stores.policies.abilities(document.id).delete
    ),
  perform: ({ getActiveModels, stores, t }) => {
    const documents = getActiveModels(Document);
    if (!documents.length) {
      return;
    }

    // A single document uses the richer delete dialog (permanent delete, child
    // handling); multiple documents use a simple confirmation to move to trash.
    if (documents.length === 1) {
      const document = documents[0];
      stores.dialogs.openModal({
        title: (
          <DialogTitle
            title={t("Delete {{ documentName }}", {
              documentName: document.noun,
            })}
            model={document}
          />
        ),
        content: (
          <DocumentDelete
            document={document}
            onSubmit={stores.dialogs.closeAllModals}
          />
        ),
      });
      return;
    }

    stores.dialogs.openModal({
      title: t("Delete {{ count }} documents", { count: documents.length }),
      content: (
        <ConfirmationDialog
          danger
          submitText={t("Delete")}
          savingText={`${t("Deleting")}…`}
          onSubmit={async () => {
            const succeeded = await performBatch(documents, (document) =>
              document.delete()
            );
            if (succeeded) {
              toast.success(
                t("{{ count }} documents moved to trash", { count: succeeded })
              );
            }
          }}
        >
          {t("Deleting these documents will move them to the trash.")}
        </ConfirmationDialog>
      ),
    });
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
        title: (
          <DialogTitle
            title={t("Permanently delete {{ documentName }}", {
              documentName: document.noun,
            })}
            model={document}
          />
        ),
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
  name: ({ t }) => `${t("Empty trash")}…`,
  analyticsName: "Empty trash",
  section: TrashSection,
  icon: <TrashIcon />,
  visible: ({ stores }) =>
    stores.documents.deleted().length > 0 && !!stores.auth.user?.isAdmin,
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
      !!activeDocumentId && can.comment && !!stores.auth.team?.commentingEnabled
    );
  },
  perform: ({ activeDocumentId, sidebarContext, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return;
    }

    // Navigate to the document when triggered from outside its scene (e.g. a
    // document list), as the comments sidebar is only rendered there.
    const path = documentPath(document);
    if (!history.location.pathname.startsWith(path)) {
      history.push(path, { sidebarContext });
    }

    stores.ui.setRightSidebar("comments", getFocusedSplitPane());
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
  shortcut: [`Meta+Shift+I`],
  icon: <GraphIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const can = stores.policies.abilities(activeDocumentId ?? "");
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;

    return !!activeDocumentId && can.listViews && !document?.isDeleted;
  },
  perform: ({ activeDocumentId, stores, t }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;
    if (!document) {
      return;
    }

    stores.dialogs.openModal({
      title: <DialogTitle title={t("Insights")} model={document} />,
      content: <Insights document={document} />,
    });
  },
});

export const toggleDocumentStats = createAction({
  name: ({ t }) => t("Show editing stats"),
  analyticsName: "Toggle document stats",
  section: ActiveDocumentSection,
  shortcut: [`Meta+Shift+G`],
  icon: <HashtagIcon />,
  selected: ({ stores }) =>
    !!stores.auth.user?.getPreference(UserPreference.ShowDocumentStats),
  visible: ({ activeDocumentId, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;

    return !!activeDocumentId && !document?.isDeleted && !isMobile();
  },
  perform: async ({ stores }) => {
    const { user } = stores.auth;
    if (!user) {
      return;
    }

    user.setPreference(
      UserPreference.ShowDocumentStats,
      !user.getPreference(UserPreference.ShowDocumentStats)
    );
    await user.save();
  },
});

/** An example of the numbering each style produces, used to aid search. */
const headingPrefixExamples: Record<HeadingPrefixStyle, string> = {
  [HeadingPrefixStyle.None]: "",
  [HeadingPrefixStyle.Numeric]: "1.1.1",
  [HeadingPrefixStyle.Alphanumeric]: "1.a.i",
  [HeadingPrefixStyle.Outline]: "I.A.1",
};

const headingPrefixNames: Record<HeadingPrefixStyle, (t: TFunction) => string> =
  {
    [HeadingPrefixStyle.None]: (t) => t("None"),
    [HeadingPrefixStyle.Numeric]: (t) => t("Multi-level decimal"),
    [HeadingPrefixStyle.Alphanumeric]: (t) => t("Alphanumeric"),
    [HeadingPrefixStyle.Outline]: (t) => t("Harvard"),
  };

const changeHeadingPrefixFactory = (style: HeadingPrefixStyle) =>
  createAction({
    name: ({ t }) => headingPrefixNames[style](t),
    // The example is displayed in the shortcut slot of menu items, but must
    // not be set on the command bar action where shortcuts are registered as
    // key sequences.
    shortcut: ({ isMenu }) =>
      isMenu && headingPrefixExamples[style]
        ? [headingPrefixExamples[style]]
        : undefined,
    keywords: headingPrefixExamples[style],
    analyticsName: "Change heading numbering",
    section: ActiveDocumentSection,
    selected: ({ activeDocumentId, stores }) => {
      const document = activeDocumentId
        ? stores.documents.get(activeDocumentId)
        : undefined;
      return (
        (document?.getPreference(DocumentPreference.HeadingPrefix) ??
          HeadingPrefixStyle.None) === style
      );
    },
    perform: async ({ activeDocumentId, stores }) => {
      const document = activeDocumentId
        ? stores.documents.get(activeDocumentId)
        : undefined;
      if (!document) {
        return;
      }
      document.setPreference(DocumentPreference.HeadingPrefix, style);
      await document.save();
    },
  });

export const changeHeadingPrefix = createActionWithChildren({
  name: ({ t }) => t("Heading numbering"),
  analyticsName: "Change heading numbering",
  section: ActiveDocumentSection,
  icon: <OrderedListIcon />,
  visible: ({ activeDocumentId, stores }) => {
    const document = activeDocumentId
      ? stores.documents.get(activeDocumentId)
      : undefined;

    return (
      !!document &&
      !document.isDeleted &&
      stores.policies.abilities(document.id).update
    );
  },
  children: Object.values(HeadingPrefixStyle).map(changeHeadingPrefixFactory),
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

export const applyTemplateActionFactory = ({
  actions,
}: {
  actions: (Action | ActionGroup | TActionSeparator)[];
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
  createNewDocument,
  createNewDocumentInAlphabeticalCollection,
  createNestedDocument,
  createTemplateFromDocument,
  deleteDocument,
  importDocument,
  downloadDocumentAsMarkdown,
  downloadDocumentAsHTML,
  downloadDocumentAsTextBundle,
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
  moveDocumentToCollection,
  openRandomDocument,
  permanentlyDeleteDocument,
  permanentlyDeleteDocumentsInTrash,
  presentDocument,
  printDocument,
  pinDocumentToCollection,
  pinDocumentToHome,
  openDocumentComments,
  openDocumentHistory,
  openDocumentInsights,
  openDocumentInDesktop,
  openDocumentInSplit,
  shareDocument,
  toggleDocumentStats,
  changeHeadingPrefix,
];
