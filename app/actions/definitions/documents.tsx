import copy from "copy-to-clipboard";
import invariant from "invariant";
import { capitalize, uniqBy } from "es-toolkit/compat";
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
  EmbedIcon,
  OpenIcon,
  SplitIcon,
} from "outline-icons";
import { toast } from "sonner";
import Icon from "@shared/components/Icon";
import type { NavigationNode } from "@shared/types";
import { ExportContentType } from "@shared/types";
import { isMobile } from "@shared/utils/browser";
import { Week } from "@shared/utils/time";
import type UserMembership from "~/models/UserMembership";
import Note from "~/models/Note";
import { client } from "~/utils/ApiClient";
import NoteDelete from "~/scenes/NoteDelete";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import NotePermanentDelete from "~/scenes/NotePermanentDelete";
import NotePublish from "~/scenes/NotePublish";
import DeleteNotesInTrash from "~/scenes/Trash/components/DeleteNotesInTrash";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { DialogTitle } from "~/components/DialogTitle";
import NoteCopy from "~/components/NoteExplorer/NoteCopy";
import { NoteDownload } from "~/components/Export/NoteDownload";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import { ImportNoteDialog } from "~/components/ImportNoteDialog";
import { getHeaderExpandedKey } from "~/components/Sidebar/components/Header";
import NoteTemplatizeDialog from "~/components/TemplatizeDialog";
import {
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
  ActiveNoteSection,
  NoteSection,
  SearchResultsSection,
  TrashSection,
} from "~/actions/sections";
import { setPersistedState } from "~/hooks/usePersistedState";
import history from "~/utils/history";
import {
  noteHistoryPath,
  homePath,
  newNotePath,
  newNestedNotePath,
  newSiblingNotePath,
  searchPath,
  notePath,
  urlify,
  desktopify,
  trashPath,
  noteEditPath,
} from "~/utils/routeHelpers";
import { getFocusedSplitPane, openRouteInSplit } from "~/utils/splitView";
import { recentNotes } from "~/components/CommandBar/useRecentNoteActions";
import { noteBreadcrumbText } from "~/components/NoteBreadcrumb";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import type {
  Action,
  ActionContext,
  ActionGroup,
  ActionSeparator,
} from "~/types";
import lazyWithRetry from "~/utils/lazyWithRetry";
import env from "~/env";
import { isMac, isWindows } from "@shared/utils/browser";
import isCloudHosted from "~/utils/isCloudHosted";
import NoteMove from "~/components/NoteExplorer/NoteMove";
const Insights = lazyWithRetry(
  () => import("~/scenes/Note/components/Insights")
);
const SharePopover = lazyWithRetry(
  () => import("~/components/Sharing/Note/SharePopover")
);
export const openNote = createActionWithChildren({
  name: ({ t }) => t("Open document"),
  analyticsName: "Open document",
  section: NoteSection,
  shortcut: ["o", "d"],
  keywords: "go to",
  icon: <DocumentIcon />,
  children: ({ stores, activeNoteId, t }) => {
    const nodes = stores.notebooks.navigationNodes.reduce(
      (acc, node) => [...acc, ...node.children],
      [] as NavigationNode[]
    );
    const notes = stores.notes.orderedData;
    // Documents already listed under "Recently viewed" are skipped so that they
    // do not appear twice in the command bar.
    const recentIds = new Set(
      recentNotes(stores.notes.recentlyViewed, activeNoteId).map(
        (note) => note.id
      )
    );
    return uniqBy([...notes, ...nodes], "id")
      .filter((item) => !recentIds.has(item.id))
      .map((item) => {
        const note = stores.notes.get(item.id);
        return createInternalLinkAction({
          // Note: using url which includes the slug rather than id here to bust
          // cache if the document is renamed
          id: item.url,
          name: item.title,
          description: note ? noteBreadcrumbText(note, t) : undefined,
          icon: item.icon ? (
            <Icon
              value={item.icon}
              initial={item.title}
              color={item.color ?? undefined}
            />
          ) : (
            <DocumentIcon outline={item.isDraft} />
          ),
          section: NoteSection,
          to: item.url,
        });
      });
  },
});
export const editNote = createInternalLinkAction({
  name: ({ t }) => t("Edit"),
  analyticsName: "Edit document",
  section: ActiveNoteSection,
  keywords: "edit",
  icon: <EditIcon />,
  visible: ({ activeNoteId, stores }) => {
    const { auth, policies } = stores;
    const can = activeNoteId ? policies.abilities(activeNoteId) : undefined;
    return !!can?.update && !!auth.user?.separateEditMode;
  },
  to: ({ activeNoteId, stores }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note) {
      return "";
    }
    return noteEditPath(note);
  },
});
export const createNote = createInternalLinkAction({
  name: ({ t }) => t("New document"),
  analyticsName: "New document",
  section: NoteSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, activeNotebookId, stores }) => {
    if (
      activeNotebookId &&
      !stores.policies.abilities(activeNotebookId).createNote
    ) {
      return false;
    }
    return (
      !!currentTeamId && stores.policies.abilities(currentTeamId).createNote
    );
  },
  to: ({ activeNotebookId, sidebarContext }) => {
    const [pathname, search] = newNotePath(activeNotebookId).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
export const createDraftNote = createInternalLinkAction({
  name: ({ t }) => t("New draft"),
  analyticsName: "New document",
  section: NoteSection,
  icon: <NewDocumentIcon />,
  keywords: "create document",
  visible: ({ currentTeamId, stores }) =>
    !!currentTeamId && stores.policies.abilities(currentTeamId).createNote,
  to: ({ sidebarContext }) => ({
    pathname: newNotePath(),
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
function findNoteSiblingIndex(
  stores: ActionContext["stores"],
  note: {
    id: string;
    notebookId?: string | null;
    parentNoteId?: string;
  }
): number {
  if (!note.notebookId) {
    return -1;
  }
  const notebook = stores.notebooks.get(note.notebookId);
  if (!notebook) {
    return -1;
  }
  const siblings = note.parentNoteId
    ? notebook.getChildrenForNote(note.parentNoteId)
    : notebook.sortedNotes;
  return siblings?.findIndex((node) => node.id === note.id) ?? -1;
}
/**
 * Determines whether the user can create a sibling of the given note.
 * A sibling shares the document's parent, so this mirrors the backend's
 * create authorization: create permission on the parent document, or on the
 * collection when the document is at the root.
 *
 * @param stores - the root stores.
 * @param document - the document to create a sibling of.
 * @returns true if the user can create a sibling.
 */
function canCreateSiblingNote(
  stores: ActionContext["stores"],
  note: {
    notebookId?: string | null;
    parentNoteId?: string;
  }
): boolean {
  return note.parentNoteId
    ? stores.policies.abilities(note.parentNoteId).createChildNote
    : !!note.notebookId &&
        stores.policies.abilities(note.notebookId).createNote;
}
export const createNestedNote = createInternalLinkAction({
  name: ({ t }) => t("Nested document"),
  analyticsName: "New document",
  section: ActiveNoteSection,
  keywords: "create nested",
  visible: ({ currentTeamId, activeNoteId, stores }) =>
    !!currentTeamId &&
    !!activeNoteId &&
    stores.policies.abilities(currentTeamId).createNote &&
    stores.policies.abilities(activeNoteId).createChildNote,
  to: ({ activeNoteId, sidebarContext }) => {
    const [pathname, search] = newNestedNotePath(activeNoteId).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
const createNoteBefore = createInternalLinkAction({
  name: ({ t }) => t("Before"),
  analyticsName: "New document before",
  section: ActiveNoteSection,
  keywords: "create before",
  visible: ({ currentTeamId, activeNoteId, stores }) => {
    if (!currentTeamId || !activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    if (!note?.notebookId) {
      return false;
    }
    const notebook = stores.notebooks.get(note.notebookId);
    if (notebook?.sort.field === "title") {
      return false;
    }
    return canCreateSiblingNote(stores, note);
  },
  to: ({ activeNoteId, stores, sidebarContext }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note) {
      return "";
    }
    const index = findNoteSiblingIndex(stores, note);
    const [pathname, search] = newSiblingNotePath({
      notebookId: note.notebookId,
      parentNoteId: note.parentNoteId,
      index: Math.max(0, index),
    }).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
const createNoteAfter = createInternalLinkAction({
  name: ({ t }) => t("After"),
  analyticsName: "New document after",
  section: ActiveNoteSection,
  keywords: "create after",
  visible: ({ currentTeamId, activeNoteId, stores }) => {
    if (!currentTeamId || !activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    if (!note?.notebookId) {
      return false;
    }
    const notebook = stores.notebooks.get(note.notebookId);
    if (notebook?.sort.field === "title") {
      return false;
    }
    return canCreateSiblingNote(stores, note);
  },
  to: ({ activeNoteId, stores, sidebarContext }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note) {
      return "";
    }
    const index = findNoteSiblingIndex(stores, note);
    const [pathname, search] = newSiblingNotePath({
      notebookId: note.notebookId,
      parentNoteId: note.parentNoteId,
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
  activeNoteId: string
): boolean {
  const note = stores.notes.get(activeNoteId);
  if (!note?.notebookId) {
    return false;
  }
  const notebook = stores.notebooks.get(note.notebookId);
  return notebook?.sort.field === "title";
}
export const createNewNote = createActionWithChildren({
  name: ({ t }) => t("New document"),
  analyticsName: "New document",
  section: ActiveNoteSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, activeNoteId, stores }) => {
    if (!activeNoteId || !currentTeamId) {
      return false;
    }
    if (!stores.policies.abilities(currentTeamId).createNote) {
      return false;
    }
    return !isAlphabeticallySorted(stores, activeNoteId);
  },
  children: [createNoteBefore, createNoteAfter, createNestedNote],
});
export const createNewNoteInAlphabeticalNotebook = createInternalLinkAction({
  name: ({ t }) => t("New document"),
  analyticsName: "New document",
  section: ActiveNoteSection,
  icon: <NewDocumentIcon />,
  keywords: "create",
  visible: ({ currentTeamId, activeNoteId, stores }) => {
    if (!activeNoteId || !currentTeamId) {
      return false;
    }
    if (!stores.policies.abilities(currentTeamId).createNote) {
      return false;
    }
    if (!stores.policies.abilities(activeNoteId).createChildNote) {
      return false;
    }
    return isAlphabeticallySorted(stores, activeNoteId);
  },
  to: ({ activeNoteId, sidebarContext }) => {
    const [pathname, search] = newNestedNotePath(activeNoteId).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
export const starNote = createAction({
  name: ({ t }) => t("Star"),
  analyticsName: "Star document",
  section: ActiveNoteSection,
  icon: <StarredIcon />,
  keywords: "favorite bookmark",
  visible: (context) =>
    everyActiveModel(
      context,
      Note,
      (note) =>
        !note.isStarred && context.stores.policies.abilities(note.id).star
    ),
  perform: async (context) => {
    await performBatchOnActiveModels(
      context,
      Note,
      (note) => note.star(),
      (notes, succeeded, t) =>
        notes.length > 1
          ? t("{{ count }} documents starred", { count: succeeded })
          : undefined
    );
    setPersistedState(getHeaderExpandedKey("starred"), true);
  },
});
export const unstarNote = createAction({
  name: ({ t }) => t("Unstar"),
  analyticsName: "Unstar document",
  section: ActiveNoteSection,
  icon: <UnstarredIcon />,
  keywords: "unfavorite unbookmark",
  visible: (context) =>
    everyActiveModel(
      context,
      Note,
      (note) =>
        note.isStarred && context.stores.policies.abilities(note.id).unstar
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Note,
      (note) => note.unstar(),
      (notes, succeeded, t) =>
        notes.length > 1
          ? t("{{ count }} documents unstarred", { count: succeeded })
          : undefined
    ),
});
export const publishNote = createAction({
  name: ({ t }) => t("Publish"),
  analyticsName: "Publish document",
  section: ActiveNoteSection,
  icon: <PublishIcon />,
  visible: ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    return !!note?.isDraft && stores.policies.abilities(activeNoteId).publish;
  },
  perform: async ({ activeNoteId, stores, t }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    if (note?.publishedAt) {
      return;
    }
    if (note?.notebookId) {
      await note.save(undefined, {
        publish: true,
      });
      toast.success(
        t("Published {{ documentName }}", {
          noteName: note.noun,
        })
      );
    } else if (note) {
      stores.dialogs.openModal({
        title: <DialogTitle title={t("Publish document")} model={note} />,
        content: <NotePublish note={note} />,
      });
    }
  },
});
export const unpublishNote = createAction({
  name: ({ t }) => t("Unpublish"),
  analyticsName: "Unpublish document",
  section: ActiveNoteSection,
  icon: <UnpublishIcon />,
  visible: (context) =>
    everyActiveModel(
      context,
      Note,
      (note) => !!context.stores.policies.abilities(note.id).unpublish
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Note,
      (note) => note.unpublish(),
      (notes, succeeded, t) =>
        notes.length === 1
          ? t("Unpublished {{ documentName }}", {
              noteName: notes[0].noun,
            })
          : t("{{ count }} documents unpublished", { count: succeeded })
    ),
});
export const subscribeNote = createAction({
  name: ({ t }) => t("Subscribe"),
  analyticsName: "Subscribe to document",
  section: ActiveNoteSection,
  icon: <SubscribeIcon />,
  tooltip: ({ activeNotebookId, isMenu, stores, t }) => {
    if (!isMenu || !activeNotebookId) {
      return undefined;
    }
    return stores.notebooks.get(activeNotebookId)?.isSubscribed
      ? t("Subscription inherited from notebook")
      : undefined;
  },
  disabled: ({ activeNotebookId, isMenu, stores }) => {
    if (!isMenu || !activeNotebookId) {
      return false;
    }
    return !!stores.notebooks.get(activeNotebookId)?.isSubscribed;
  },
  visible: ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    return (
      !!note?.isActive &&
      !note?.notebook?.isSubscribed &&
      !note?.isSubscribed &&
      stores.policies.abilities(activeNoteId).subscribe
    );
  },
  perform: async ({ activeNoteId, stores, t }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    await note?.subscribe();
    toast.success(t("Subscribed to document notifications"));
  },
});
export const unsubscribeNote = createAction({
  name: ({ t }) => t("Unsubscribe"),
  analyticsName: "Unsubscribe from document",
  section: ActiveNoteSection,
  icon: <UnsubscribeIcon />,
  tooltip: ({ activeNotebookId, isMenu, stores, t }) => {
    if (!isMenu || !activeNotebookId) {
      return undefined;
    }
    return stores.notebooks.get(activeNotebookId)?.isSubscribed
      ? t("Subscription inherited from notebook")
      : undefined;
  },
  disabled: ({ activeNotebookId, isMenu, stores }) => {
    if (!isMenu || !activeNotebookId) {
      return false;
    }
    return !!stores.notebooks.get(activeNotebookId)?.isSubscribed;
  },
  visible: ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    return (
      !!note?.isActive &&
      (!!note?.notebook?.isSubscribed ||
        (!!note?.isSubscribed &&
          stores.policies.abilities(activeNoteId).unsubscribe))
    );
  },
  perform: async ({ activeNoteId, stores, currentUserId, t }) => {
    if (!activeNoteId || !currentUserId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    await note?.unsubscribe();
    toast.success(t("Unsubscribed from document notifications"));
  },
});
export const shareNote = createAction({
  name: ({ t }) => `${t("Permissions")}…`,
  analyticsName: "Share document",
  section: ActiveNoteSection,
  icon: <PadlockIcon />,
  visible: ({ stores, activeNoteId }) => {
    if (!activeNoteId) {
      return false;
    }
    const can = stores.policies.abilities(activeNoteId);
    return can.manageUsers || can.share;
  },
  perform: async ({ activeNoteId, stores, currentUserId, t }) => {
    if (!activeNoteId || !currentUserId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    if (!note) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Share document")} model={note} />,
      content: (
        <SharePopover
          note={note}
          onRequestClose={stores.dialogs.closeAllModals}
          visible
        />
      ),
    });
  },
});
export const downloadNote = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Download") : t("Download document")),
  analyticsName: "Download document",
  section: ActiveNoteSection,
  icon: <DownloadIcon />,
  keywords: "export md markdown html",
  visible: ({ activeNoteId, stores }) =>
    !!activeNoteId && stores.policies.abilities(activeNoteId).download,
  perform: ({ activeNoteId, t, stores }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    invariant(note, "Document must exist");
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Download document")} model={note} />,
      content: (
        <NoteDownload note={note} onSubmit={stores.dialogs.closeAllModals} />
      ),
    });
  },
});
export const downloadNoteAsMarkdown = createAction({
  name: ({ t }) => t("Download as Markdown"),
  analyticsName: "Download document as Markdown",
  section: ActiveNoteSection,
  keywords: "md markdown export",
  icon: <DownloadIcon />,
  visible: ({ activeNoteId, stores }) =>
    !!activeNoteId && stores.policies.abilities(activeNoteId).download,
  perform: async ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    await note?.download({
      contentType: ExportContentType.Markdown,
      includeChildNotes: false,
    });
  },
});
export const downloadNoteAsHTML = createAction({
  name: ({ t }) => t("Download as HTML"),
  analyticsName: "Download document as HTML",
  section: ActiveNoteSection,
  keywords: "xml html export",
  icon: <DownloadIcon />,
  visible: ({ activeNoteId, stores }) =>
    !!activeNoteId && stores.policies.abilities(activeNoteId).download,
  perform: async ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    await note?.download({
      contentType: ExportContentType.Html,
      includeChildNotes: false,
    });
  },
});
export const downloadNoteAsTextBundle = createAction({
  name: ({ t }) => t("Download as TextBundle"),
  analyticsName: "Download document as TextBundle",
  section: ActiveNoteSection,
  keywords: "textbundle textpack bear ulysses export",
  icon: <DownloadIcon />,
  visible: ({ activeNoteId, stores }) =>
    !!activeNoteId && stores.policies.abilities(activeNoteId).download,
  perform: async ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    await note?.download({
      contentType: ExportContentType.TextBundle,
      includeChildNotes: false,
    });
  },
});
export const downloadNoteAsPDF = createAction({
  name: ({ t }) => t("Download as PDF"),
  analyticsName: "Download document as PDF",
  section: ActiveNoteSection,
  keywords: "pdf export",
  icon: <DownloadIcon />,
  visible: ({ activeNoteId, stores }) =>
    !!(
      activeNoteId &&
      stores.policies.abilities(activeNoteId).download &&
      env.PDF_EXPORT_ENABLED
    ),
  perform: async ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    await note?.download({
      contentType: ExportContentType.Pdf,
      includeChildNotes: false,
    });
  },
});
export const copyNoteAsMarkdown = createAction({
  name: ({ t }) => t("Copy as Markdown"),
  section: ActiveNoteSection,
  keywords: "clipboard",
  icon: <MarkdownIcon />,
  iconInContextMenu: false,
  visible: ({ activeNoteId, stores }) =>
    !!activeNoteId && stores.policies.abilities(activeNoteId).download,
  perform: async ({ stores, activeNoteId, t }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (note) {
      const res = await client.post("/documents.export", {
        id: note.id,
        signedUrls: Week.seconds, // 7 days (AWS S3 max for presigned URLs)
      });
      copy(res.data);
      toast.success(t("Markdown copied to clipboard"));
    }
  },
});
export const copyNoteAsPlainText = createAction({
  name: ({ t }) => t("Copy as text"),
  section: ActiveNoteSection,
  keywords: "clipboard",
  icon: <CaseSensitiveIcon />,
  iconInContextMenu: false,
  visible: ({ activeNoteId, stores }) =>
    !!activeNoteId && stores.policies.abilities(activeNoteId).download,
  perform: async ({ stores, activeNoteId, t }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (note) {
      copy(ProsemirrorHelper.toPlainText(note));
      toast.success(t("Text copied to clipboard"));
    }
  },
});
export const copyNoteShareLink = createAction({
  name: ({ t }) => t("Copy public link"),
  section: ActiveNoteSection,
  keywords: "clipboard share",
  icon: <GlobeIcon />,
  iconInContextMenu: false,
  visible: ({ activeNoteId, stores }) =>
    !!activeNoteId && !!stores.shares.getByNoteId(activeNoteId)?.published,
  perform: ({ stores, activeNoteId, t }) => {
    if (!activeNoteId) {
      return;
    }
    const share = stores.shares.getByNoteId(activeNoteId);
    if (share) {
      copy(share.url);
      toast.success(t("Link copied to clipboard"));
    }
  },
});
export const copyNoteLink = createAction({
  name: ({ t }) => t("Copy link"),
  section: ActiveNoteSection,
  keywords: "clipboard",
  icon: <CopyIcon />,
  iconInContextMenu: false,
  visible: ({ activeNoteId }) => !!activeNoteId,
  perform: ({ stores, activeNoteId, t }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (note) {
      copy(urlify(notePath(note)));
      toast.success(t("Link copied to clipboard"));
    }
  },
});
export const copyNote = createActionWithChildren({
  name: ({ t }) => t("Copy"),
  analyticsName: "Copy document",
  section: ActiveNoteSection,
  icon: <CopyIcon />,
  keywords: "clipboard",
  children: [
    copyNoteLink,
    copyNoteShareLink,
    copyNoteAsMarkdown,
    copyNoteAsPlainText,
  ],
});
export const duplicateNote = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Duplicate")}…` : t("Duplicate document"),
  analyticsName: "Duplicate document",
  section: ActiveNoteSection,
  icon: <DuplicateIcon />,
  keywords: "copy",
  visible: ({ activeNoteId, stores }) =>
    !!activeNoteId && stores.policies.abilities(activeNoteId).duplicate,
  perform: async ({ activeNoteId, t, stores }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    invariant(note, "Document must exist");
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Duplicate document")} model={note} />,
      content: (
        <NoteCopy
          note={note}
          onSubmit={(response) => {
            stores.dialogs.closeAllModals();
            history.push(notePath(response[0]));
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
export const pinNoteToNotebook = createAction({
  name: ({ getActiveModels, t, stores }) => {
    const notes = getActiveModels(Note);
    if (notes.length === 1) {
      const notebookName = stores.notes.getNotebookForNote(notes[0])?.name;
      return t("Pin to {{notebookName}}", {
        notebookName: notebookName ?? t("notebook"),
      });
    }
    return t("Pin");
  },
  analyticsName: "Pin document to notebook",
  section: ActiveNoteSection,
  icon: <PinIcon />,
  iconInContextMenu: false,
  visible: (context) =>
    everyActiveModel(
      context,
      Note,
      (note) =>
        !!note.notebookId &&
        !note.pinned &&
        !!context.stores.policies.abilities(note.id).pin
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Note,
      (note) => note.pin(note.notebookId),
      (notes, succeeded, t) =>
        notes.length === 1
          ? t("Pinned to notebook")
          : t("{{ count }} documents pinned", { count: succeeded })
    ),
});
/**
 * Pin a document to team home. Pinned documents will be displayed at the top
 * of the home screen for all team members to see.
 */
export const pinNoteToHome = createAction({
  name: ({ t }) => t("Pin to home"),
  analyticsName: "Pin document to home",
  section: ActiveNoteSection,
  icon: <PinIcon />,
  iconInContextMenu: false,
  visible: ({ activeNoteId, currentTeamId, stores }) => {
    if (!currentTeamId || !activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    return (
      !!stores.policies.abilities(activeNoteId).pinToHome && !note?.pinnedToHome
    );
  },
  perform: async ({ activeNoteId, location, t, stores }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    await note?.pin();
    if (location.pathname !== homePath()) {
      toast.success(t("Pinned to home"));
    }
  },
});
export const pinNote = createActionWithChildren({
  name: ({ t }) => t("Pin"),
  analyticsName: "Pin document",
  section: ActiveNoteSection,
  icon: <PinIcon />,
  children: [pinNoteToNotebook, pinNoteToHome],
});
export const unpinNote = createAction({
  name: ({ t }) => t("Unpin"),
  analyticsName: "Unpin document",
  section: ActiveNoteSection,
  icon: <PinIcon />,
  visible: (context) =>
    everyActiveModel(
      context,
      Note,
      (note) =>
        note.pinned && !!context.stores.policies.abilities(note.id).unpin
    ),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Note,
      (note) => note.unpin(note.notebookId ?? undefined),
      (notes, succeeded, t) =>
        notes.length === 1
          ? t("Unpinned")
          : t("{{ count }} documents unpinned", { count: succeeded })
    ),
});
export const searchInNote = createInternalLinkAction({
  name: ({ t }) => t("Search in document"),
  analyticsName: "Search document",
  section: ActiveNoteSection,
  shortcut: [`Meta+/`],
  icon: <SearchIcon />,
  visible: ({ stores, activeNoteId }) => {
    if (!activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    return !!note?.isActive;
  },
  to: ({ activeNoteId, sidebarContext }) => {
    if (!activeNoteId) {
      return "";
    }
    const [pathname, search] = searchPath({
      noteId: activeNoteId,
    }).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
export const printNote = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Print") : t("Print document")),
  analyticsName: "Print document",
  section: ActiveNoteSection,
  icon: <PrintIcon />,
  visible: ({ activeNoteId }) => !!(activeNoteId && window.print),
  perform: () => {
    setTimeout(window.print, 0);
  },
});
export const openNoteInDesktop = createAction({
  name: ({ t }) => t("Open in desktop app"),
  analyticsName: "Open in desktop",
  section: ActiveNoteSection,
  icon: <OpenIcon />,
  visible: ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    return (
      isCloudHosted &&
      (isMac || isWindows) &&
      !!note &&
      !note.isDeleted &&
      !isMobile()
    );
  },
  perform: ({ activeNoteId, stores }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (note) {
      window.location.href = desktopify(notePath(note));
    }
  },
});
export const openNoteInSplit = createAction({
  name: ({ t }) => t("Open in split view"),
  analyticsName: "Open document in split view",
  section: ActiveNoteSection,
  icon: <SplitIcon />,
  keywords: "split side pane",
  visible: ({ activeNoteId, stores }) => {
    if (!activeNoteId || isMobile()) {
      return false;
    }
    return !!stores.notes.get(activeNoteId);
  },
  perform: ({ activeNoteId, stores }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (note) {
      openRouteInSplit(history, notePath(note));
    }
  },
});
export const presentNote = createAction({
  name: ({ t, isMenu }) => (isMenu ? t("Present") : t("Present document")),
  analyticsName: "Present document",
  section: ActiveNoteSection,
  icon: <EmbedIcon />,
  shortcut: ["Control+Alt+KeyP"],
  visible: ({ activeNoteId }) => !!activeNoteId && !isMobile(),
  perform: ({ activeNoteId, stores }) => {
    if (stores.ui.presentationData) {
      stores.ui.setPresentingNote(null);
      return;
    }
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note) {
      return;
    }
    stores.ui.setPresentingNote(note);
  },
});
/**
 * Returns the document or collection that an import will be nested inside.
 *
 * @param context - the action context.
 * @returns the parent model, if it is loaded.
 */
function getImportParent({
  activeNoteId,
  activeNotebookId,
  stores,
}: ActionContext) {
  if (activeNoteId) {
    return stores.notes.get(activeNoteId);
  }
  return activeNotebookId ? stores.notebooks.get(activeNotebookId) : undefined;
}
export const importNote = dialogActionFactory({
  analyticsName: "Import document",
  section: NoteSection,
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
  content: (onSubmit, { activeNoteId, activeNotebookId }) => (
    <ImportNoteDialog
      noteId={activeNoteId}
      notebookId={activeNotebookId}
      onSubmit={onSubmit}
    />
  ),
  visible: ({ activeNotebookId, activeNoteId, stores }) => {
    if (activeNoteId) {
      return !!stores.policies.abilities(activeNoteId).createChildNote;
    }
    if (activeNotebookId) {
      return !!stores.policies.abilities(activeNotebookId).createNote;
    }
    return false;
  },
});
export const createTemplateFromNote = createAction({
  name: ({ t }) => `${t("Templatize")}…`,
  analyticsName: "Templatize document",
  section: ActiveNoteSection,
  icon: <ShapesIcon />,
  keywords: "new create template",
  visible: ({ activeNotebookId, activeNoteId, stores }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note?.isActive) {
      return false;
    }
    return !!(
      !!activeNotebookId &&
      stores.policies.abilities(activeNotebookId).createTemplate
    );
  },
  perform: ({ activeNoteId, stores, t, event }) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    if (!note) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Create template")} model={note} />,
      content: <NoteTemplatizeDialog noteId={activeNoteId} />,
    });
  },
});
export const openRandomNote = createAction({
  id: "random",
  name: ({ t }) => t(`Open random document`),
  analyticsName: "Open random document",
  section: NoteSection,
  icon: <ShuffleIcon />,
  perform: ({ stores, activeNoteId }) => {
    const nodes = stores.notebooks.navigationNodes
      .reduce((acc, node) => [...acc, ...node.children], [] as NavigationNode[])
      .filter((node) => node.id !== activeNoteId);
    const random = nodes[Math.round(Math.random() * nodes.length)];
    if (random) {
      history.push(random.url);
    }
  },
});
export const searchNotesForQueryActionFactory = (query: string) =>
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
export const moveNoteToNotebook = createAction({
  name: ({ t }) => t("Move"),
  analyticsName: "Move document",
  section: ActiveNoteSection,
  icon: <MoveIcon />,
  iconInContextMenu: false,
  visible: ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return false;
    }
    return !!stores.policies.abilities(activeNoteId).move;
  },
  perform: ({ activeNoteId, stores, t }) => {
    if (activeNoteId) {
      const note = stores.notes.get(activeNoteId);
      if (!note) {
        return;
      }
      stores.dialogs.openModal({
        title: (
          <DialogTitle
            title={t("Move {{ documentType }}", {
              noteType: note.noun,
            })}
            model={note}
          />
        ),
        content: <NoteMove note={note} />,
      });
    }
  },
});
export const moveNote = createAction({
  name: ({ t }) => t("Move"),
  analyticsName: "Move document",
  section: ActiveNoteSection,
  icon: <MoveIcon />,
  visible: ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return false;
    }
    const note = stores.notes.get(activeNoteId);
    if (!note) {
      return false;
    }
    return !!stores.policies.abilities(activeNoteId).move;
  },
  perform: moveNoteToNotebook.perform,
});
export const archiveNote = createAction({
  name: ({ t }) => `${t("Archive")}…`,
  analyticsName: "Archive document",
  section: ActiveNoteSection,
  icon: <ArchiveIcon />,
  visible: (context) =>
    everyActiveModel(
      context,
      Note,
      (note) => !!context.stores.policies.abilities(note.id).archive
    ),
  perform: async ({ getActiveModels, stores, t }) => {
    const notes = getActiveModels(Note);
    if (!notes.length) {
      return;
    }
    stores.dialogs.openModal({
      title:
        notes.length === 1 ? (
          <DialogTitle
            title={t("Are you sure you want to archive this note?")}
            model={notes[0]}
          />
        ) : (
          t("Are you sure you want to archive {{ count }} notes?", {
            count: notes.length,
          })
        ),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            const succeeded = await performBatch(notes, (note) =>
              note.archive()
            );
            if (succeeded) {
              toast.success(
                notes.length === 1
                  ? t("Document archived")
                  : t("{{ count }} documents archived", { count: succeeded })
              );
            }
          }}
          savingText={`${t("Archiving")}…`}
        >
          {notes.length === 1
            ? t(
                "Archiving this document will remove it from the notebook and search results."
              )
            : t(
                "Archiving these documents will remove them from their notebooks and search results."
              )}
        </ConfirmationDialog>
      ),
    });
  },
});
export const restoreNote = createAction({
  name: ({ t }) => `${t("Restore")}`,
  analyticsName: "Restore document",
  section: ActiveNoteSection,
  icon: <RestoreIcon />,
  visible: (context) =>
    everyActiveModel(context, Note, (note) => {
      const notebook = note.notebookId
        ? context.stores.notebooks.get(note.notebookId)
        : undefined;
      const can = context.stores.policies.abilities(note.id);
      return !!notebook?.isActive && !!(can.restore || can.unarchive);
    }),
  perform: (context) =>
    performBatchOnActiveModels(
      context,
      Note,
      (note) => note.restore(),
      (notes, succeeded, t) =>
        notes.length === 1
          ? t("{{ documentName }} restored", {
              noteName: capitalize(notes[0].noun),
            })
          : t("{{ count }} documents restored", { count: succeeded })
    ),
});
export const restoreNoteToNotebook = createActionWithChildren({
  name: ({ t }) => `${t("Restore")}…`,
  analyticsName: "Restore document",
  section: ActiveNoteSection,
  icon: <RestoreIcon />,
  visible: ({ stores, activeNoteId }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note) {
      return false;
    }
    const can = stores.policies.abilities(note.id);
    const notebook = note.notebookId
      ? stores.notebooks.get(note.notebookId)
      : undefined;
    return !notebook?.isActive && !!(can.restore || can.unarchive);
  },
  children: ({ t, activeNoteId, stores }) => {
    const { notebooks, notes, policies } = stores;
    const note = activeNoteId ? notes.get(activeNoteId) : undefined;
    if (!note) {
      return [];
    }
    const actions = notebooks.orderedData.map((notebook) => {
      const can = policies.abilities(notebook.id);
      return createAction({
        name: notebook.name,
        section: ActiveNoteSection,
        icon: <CollectionIcon notebook={notebook} />,
        visible: can.createNote,
        perform: async () => {
          await note.restore({ notebookId: notebook.id });
          toast.success(
            t("{{ documentName }} restored", {
              noteName: capitalize(note.noun),
            })
          );
        },
      });
    });
    return [createActionGroup({ name: t("Choose a notebook"), actions })];
  },
});
export const deleteNote = createAction({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Delete document",
  section: ActiveNoteSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: (context) =>
    everyActiveModel(
      context,
      Note,
      (note) => !!context.stores.policies.abilities(note.id).delete
    ),
  perform: ({ getActiveModels, stores, t }) => {
    const notes = getActiveModels(Note);
    if (!notes.length) {
      return;
    }
    // A single document uses the richer delete dialog (permanent delete, child
    // handling); multiple documents use a simple confirmation to move to trash.
    if (notes.length === 1) {
      const note = notes[0];
      stores.dialogs.openModal({
        title: (
          <DialogTitle
            title={t("Delete {{ documentName }}", {
              noteName: note.noun,
            })}
            model={note}
          />
        ),
        content: (
          <NoteDelete note={note} onSubmit={stores.dialogs.closeAllModals} />
        ),
      });
      return;
    }
    stores.dialogs.openModal({
      title: t("Delete {{ count }} documents", { count: notes.length }),
      content: (
        <ConfirmationDialog
          danger
          submitText={t("Delete")}
          savingText={`${t("Deleting")}…`}
          onSubmit={async () => {
            const succeeded = await performBatch(notes, (note) =>
              note.delete()
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
export const permanentlyDeleteNote = createAction({
  name: ({ t }) => t("Permanently delete"),
  analyticsName: "Permanently delete document",
  section: ActiveNoteSection,
  icon: <CrossIcon />,
  dangerous: true,
  visible: ({ activeNoteId, stores }) => {
    if (!activeNoteId) {
      return false;
    }
    return !!stores.policies.abilities(activeNoteId).permanentDelete;
  },
  perform: ({ activeNoteId, stores, t }) => {
    if (activeNoteId) {
      const note = stores.notes.get(activeNoteId);
      if (!note) {
        return;
      }
      stores.dialogs.openModal({
        title: (
          <DialogTitle
            title={t("Permanently delete {{ documentName }}", {
              noteName: note.noun,
            })}
            model={note}
          />
        ),
        content: (
          <NotePermanentDelete
            note={note}
            onSubmit={stores.dialogs.closeAllModals}
          />
        ),
      });
    }
  },
});
export const permanentlyDeleteNotesInTrash = createAction({
  name: ({ t }) => `${t("Empty trash")}…`,
  analyticsName: "Empty trash",
  section: TrashSection,
  icon: <TrashIcon />,
  visible: ({ stores }) =>
    stores.notes.deleted.length > 0 && !!stores.auth.user?.isAdmin,
  perform: ({ stores, t, location }) => {
    stores.dialogs.openModal({
      title: t("Permanently delete documents in trash"),
      content: (
        <DeleteNotesInTrash
          onSubmit={stores.dialogs.closeAllModals}
          shouldRedirect={location.pathname === trashPath()}
        />
      ),
    });
  },
});
export const openNoteComments = createAction({
  name: ({ t }) => t("Comments"),
  analyticsName: "Open comments",
  section: ActiveNoteSection,
  icon: <CommentIcon />,
  visible: ({ activeNoteId, stores }) => {
    const can = stores.policies.abilities(activeNoteId ?? "");
    return (
      !!activeNoteId && can.comment && !!stores.auth.team?.commentingEnabled
    );
  },
  perform: ({ activeNoteId, sidebarContext, stores }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note) {
      return;
    }
    // Navigate to the document when triggered from outside its scene (e.g. a
    // document list), as the comments sidebar is only rendered there.
    const path = notePath(note);
    if (!history.location.pathname.startsWith(path)) {
      history.push(path, { sidebarContext });
    }
    stores.ui.setRightSidebar("comments", getFocusedSplitPane());
  },
});
export const openNoteHistory = createInternalLinkAction({
  name: ({ t }) => t("History"),
  analyticsName: "Open document history",
  section: ActiveNoteSection,
  icon: <HistoryIcon />,
  visible: ({ activeNoteId, stores }) => {
    const can = stores.policies.abilities(activeNoteId ?? "");
    return !!activeNoteId && can.listRevisions;
  },
  to: ({ activeNoteId, stores, sidebarContext }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note) {
      return "";
    }
    const [pathname, search] = noteHistoryPath(note).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
export const openNoteInsights = createAction({
  name: ({ t }) => t("Insights"),
  analyticsName: "Open document insights",
  section: ActiveNoteSection,
  shortcut: [`Meta+Shift+I`],
  icon: <GraphIcon />,
  visible: ({ activeNoteId, stores }) => {
    const can = stores.policies.abilities(activeNoteId ?? "");
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    return !!activeNoteId && can.listViews && !note?.isDeleted;
  },
  perform: ({ activeNoteId, stores, t }) => {
    const note = activeNoteId ? stores.notes.get(activeNoteId) : undefined;
    if (!note) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Insights")} model={note} />,
      content: <Insights note={note} />,
    });
  },
});
export const leaveNote = createAction({
  name: ({ t }) => t("Leave document"),
  analyticsName: "Leave document",
  section: ActiveNoteSection,
  icon: <LogoutIcon />,
  visible: ({ currentUserId, activeNoteId, stores }) => {
    const membership = stores.userMemberships.orderedData.find(
      (m) => m.noteId === activeNoteId && m.userId === currentUserId
    );
    return !!membership;
  },
  perform: async ({ t, location, currentUserId, activeNoteId, stores }) => {
    if (!activeNoteId) {
      return;
    }
    const note = stores.notes.get(activeNoteId);
    try {
      if (note && location.pathname.startsWith(note.path)) {
        history.push(homePath());
      }
      await stores.userMemberships.delete({
        noteId: activeNoteId,
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
  actions: (Action | ActionGroup | ActionSeparator)[];
}) =>
  createActionWithChildren({
    name: ({ t }) => t("Apply template"),
    analyticsName: "Apply template",
    section: ActiveNoteSection,
    icon: <ShapesIcon />,
    visible: ({ activeNoteId, stores }) => {
      const { policies } = stores;
      const can = activeNoteId ? policies.abilities(activeNoteId) : undefined;
      return !!can?.update;
    },
    children: actions,
  });
export const rootNoteActions = [
  openNote,
  archiveNote,
  createNote,
  createDraftNote,
  createNewNote,
  createNewNoteInAlphabeticalNotebook,
  createNestedNote,
  createTemplateFromNote,
  deleteNote,
  importNote,
  downloadNote,
  downloadNoteAsMarkdown,
  downloadNoteAsHTML,
  downloadNoteAsTextBundle,
  downloadNoteAsPDF,
  copyNoteLink,
  copyNoteShareLink,
  copyNoteAsMarkdown,
  copyNoteAsPlainText,
  starNote,
  unstarNote,
  publishNote,
  unpublishNote,
  subscribeNote,
  unsubscribeNote,
  searchInNote,
  duplicateNote,
  leaveNote,
  moveNoteToNotebook,
  openRandomNote,
  permanentlyDeleteNote,
  permanentlyDeleteNotesInTrash,
  presentNote,
  printNote,
  pinNoteToNotebook,
  pinNoteToHome,
  openNoteComments,
  openNoteHistory,
  openNoteInsights,
  openNoteInDesktop,
  openNoteInSplit,
  shareNote,
];
