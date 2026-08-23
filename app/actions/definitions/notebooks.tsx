import {
  SortAlphabeticalReverseIcon,
  SortAlphabeticalIcon,
  ArchiveIcon,
  CollectionIcon,
  DuplicateIcon,
  EditIcon,
  ExportIcon,
  ImportIcon,
  SortManualIcon,
  NewDocumentIcon,
  PadlockIcon,
  PlusIcon,
  RestoreIcon,
  SearchIcon,
  ShapesIcon,
  SplitIcon,
  StarredIcon,
  SubscribeIcon,
  TrashIcon,
  UnstarredIcon,
  UnsubscribeIcon,
} from "outline-icons";
import { toast } from "sonner";
import Notebook from "~/models/Notebook";
import { NotebookEdit } from "~/components/Notebook/NotebookEdit";
import { NotebookNew } from "~/components/Notebook/NotebookNew";
import NotebookDeleteDialog from "~/components/NotebookDeleteDialog";
import NotebookDuplicateDialog from "~/components/NotebookDuplicateDialog";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { DialogTitle } from "~/components/DialogTitle";
import DynamicCollectionIcon from "~/components/Icons/NotebookIcon";
import { ImportNoteDialog } from "~/components/ImportNoteDialog";
import { getHeaderExpandedKey } from "~/components/Sidebar/components/Header";
import {
  createAction,
  createInternalLinkAction,
  createActionWithChildren,
} from "~/actions";
import { dialogActionFactory } from "~/actions/definitions/common";
import { ActiveNotebookSection, NotebookSection } from "~/actions/sections";
import { setPersistedState } from "~/hooks/usePersistedState";
import { newNotePath, newTemplatePath, searchPath } from "~/utils/routeHelpers";
import { ExportDialog } from "~/components/Export/ExportDialog";
import { isMobile } from "@shared/utils/browser";
import history from "~/utils/history";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { openRouteInSplit } from "~/utils/splitView";
const ColorNotebookIcon = ({ notebook }: { notebook: Notebook }) => (
  <DynamicCollectionIcon notebook={notebook} />
);
const SharePopover = lazyWithRetry(
  () => import("~/components/Sharing/Notebook/SharePopover")
);
export const openNotebook = createActionWithChildren({
  name: ({ t }) => t("Open notebook"),
  analyticsName: "Open notebook",
  section: NotebookSection,
  shortcut: ["o", "c"],
  icon: <CollectionIcon />,
  children: ({ stores }) => {
    const notebooks = stores.notebooks.orderedData;
    return notebooks.map((notebook) =>
      createInternalLinkAction({
        // Note: using url which includes the slug rather than id here to bust
        // cache if the notebook is renamed
        id: notebook.path,
        name: notebook.name,
        icon: <ColorNotebookIcon notebook={notebook} />,
        section: NotebookSection,
        to: notebook.path,
      })
    );
  },
});
export const createNotebook = dialogActionFactory({
  analyticsName: "New notebook",
  section: NotebookSection,
  name: (t) => t("New notebook"),
  title: (t) => t("Create a notebook"),
  content: (onSubmit) => <NotebookNew onSubmit={onSubmit} />,
  icon: <PlusIcon />,
  keywords: "create",
  stopEvent: true,
  visible: ({ stores }) =>
    stores.policies.abilities(stores.auth.team?.id || "").createNotebook,
});
export const editNotebook = createAction({
  name: ({ t, isMenu }) => (isMenu ? `${t("Edit")}…` : t("Edit notebook")),
  analyticsName: "Edit notebook",
  section: ActiveNotebookSection,
  icon: <EditIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.update),
  perform: ({ t, getActiveModel, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Edit notebook")} model={notebook} />,
      content: (
        <NotebookEdit
          onSubmit={stores.dialogs.closeAllModals}
          notebookId={notebook.id}
        />
      ),
    });
  },
});
export const editNotebookPermissions = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Permissions")}…` : t("Notebook permissions"),
  analyticsName: "Notebook permissions",
  section: ActiveNotebookSection,
  icon: <PadlockIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.update),
  perform: ({ t, getActiveModel, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Share this notebook")} model={notebook} />,
      content: (
        <SharePopover
          notebook={notebook}
          onRequestClose={stores.dialogs.closeAllModals}
          visible
        />
      ),
    });
  },
});
export const duplicateNotebook = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Duplicate")}…` : t("Duplicate notebook"),
  analyticsName: "Duplicate notebook",
  section: ActiveNotebookSection,
  icon: <DuplicateIcon />,
  keywords: "copy",
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.duplicate),
  perform: ({ getActiveModel, t, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Duplicate notebook")} model={notebook} />,
      content: (
        <NotebookDuplicateDialog
          notebook={notebook}
          onSubmit={stores.dialogs.closeAllModals}
        />
      ),
    });
  },
});
export const importNote = dialogActionFactory({
  analyticsName: "Import document",
  section: ActiveNotebookSection,
  width: "640px",
  icon: <ImportIcon />,
  name: (t) => `${t("Import documents")}…`,
  title: (t, { getActiveModel }) => (
    <DialogTitle
      title={t("Import documents")}
      model={getActiveModel(Notebook)}
    />
  ),
  content: (onSubmit, { getActiveModel }) => {
    const notebook = getActiveModel(Notebook);
    return notebook ? (
      <ImportNoteDialog notebookId={notebook.id} onSubmit={onSubmit} />
    ) : null;
  },
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.createNote),
});
export const sortNotebook = createActionWithChildren({
  name: ({ t }) => t("Sort in sidebar"),
  section: ActiveNotebookSection,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.update),
  icon: ({ getActiveModel }) => {
    const notebook = getActiveModel(Notebook);
    const sortAlphabetical = notebook?.sort.field === "title";
    const sortDir = notebook?.sort.direction;
    return sortAlphabetical ? (
      sortDir === "asc" ? (
        <SortAlphabeticalIcon />
      ) : (
        <SortAlphabeticalReverseIcon />
      )
    ) : (
      <SortManualIcon />
    );
  },
  children: [
    createAction({
      name: ({ t }) => t("A-Z sort"),
      section: ActiveNotebookSection,
      selected: ({ getActiveModel }) => {
        const notebook = getActiveModel(Notebook);
        return (
          notebook?.sort.field === "title" && notebook?.sort.direction === "asc"
        );
      },
      perform: ({ getActiveModel }) => {
        const notebook = getActiveModel(Notebook);
        return notebook?.save({
          sort: {
            field: "title",
            direction: "asc",
          },
        });
      },
    }),
    createAction({
      name: ({ t }) => t("Z-A sort"),
      section: ActiveNotebookSection,
      selected: ({ getActiveModel }) => {
        const notebook = getActiveModel(Notebook);
        return (
          notebook?.sort.field === "title" &&
          notebook?.sort.direction === "desc"
        );
      },
      perform: ({ getActiveModel }) => {
        const notebook = getActiveModel(Notebook);
        return notebook?.save({
          sort: {
            field: "title",
            direction: "desc",
          },
        });
      },
    }),
    createAction({
      name: ({ t }) => t("Manual sort"),
      section: ActiveNotebookSection,
      selected: ({ getActiveModel }) => {
        const notebook = getActiveModel(Notebook);
        return notebook?.sort.field !== "title";
      },
      perform: ({ getActiveModel }) => {
        const notebook = getActiveModel(Notebook);
        return notebook?.save({
          sort: {
            field: "index",
            direction: "asc",
          },
        });
      },
    }),
  ],
});
export const openNotebookInSplit = createAction({
  name: ({ t }) => t("Open in split view"),
  analyticsName: "Open notebook in split view",
  section: ActiveNotebookSection,
  icon: <SplitIcon />,
  keywords: "split side pane",
  visible: ({ getActiveModel }) => !!getActiveModel(Notebook) && !isMobile(),
  perform: ({ getActiveModel }) => {
    const notebook = getActiveModel(Notebook);
    if (notebook) {
      openRouteInSplit(history, notebook.path);
    }
  },
});
export const searchInNotebook = createInternalLinkAction({
  name: ({ t }) => t("Search in notebook"),
  analyticsName: "Search notebook",
  section: ActiveNotebookSection,
  icon: <SearchIcon />,
  visible: ({ getActiveModel, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook?.isActive) {
      return false;
    }
    return stores.policies.abilities(notebook.id).readNote;
  },
  to: ({ getActiveModel, sidebarContext }) => {
    const notebook = getActiveModel(Notebook);
    const [pathname, search] = searchPath({
      notebookId: notebook?.id,
    }).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
export const starNotebook = createAction({
  name: ({ t }) => t("Star"),
  analyticsName: "Star notebook",
  section: ActiveNotebookSection,
  icon: <StarredIcon />,
  keywords: "favorite bookmark",
  visible: ({ getActiveModel, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return false;
    }
    return !notebook.isStarred && stores.policies.abilities(notebook.id).star;
  },
  perform: async ({ getActiveModel }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    await notebook.star();
    setPersistedState(getHeaderExpandedKey("starred"), true);
  },
});
export const unstarNotebook = createAction({
  name: ({ t }) => t("Unstar"),
  analyticsName: "Unstar notebook",
  section: ActiveNotebookSection,
  icon: <UnstarredIcon />,
  keywords: "unfavorite unbookmark",
  visible: ({ getActiveModel, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return false;
    }
    return (
      !!notebook.isStarred && stores.policies.abilities(notebook.id).unstar
    );
  },
  perform: async ({ getActiveModel }) => {
    const notebook = getActiveModel(Notebook);
    await notebook?.unstar();
  },
});
export const subscribeNotebook = createAction({
  name: ({ t }) => t("Subscribe"),
  analyticsName: "Subscribe to notebook",
  section: ActiveNotebookSection,
  icon: <SubscribeIcon />,
  visible: ({ getActiveModel, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return false;
    }
    return (
      !!notebook.isActive &&
      !notebook.isSubscribed &&
      stores.policies.abilities(notebook.id).subscribe
    );
  },
  perform: async ({ getActiveModel, t }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    await notebook.subscribe();
    toast.success(t("Subscribed to document notifications"));
  },
});
export const unsubscribeNotebook = createAction({
  name: ({ t }) => t("Unsubscribe"),
  analyticsName: "Unsubscribe from notebook",
  section: ActiveNotebookSection,
  icon: <UnsubscribeIcon />,
  visible: ({ getActiveModel, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return false;
    }
    return (
      !!notebook.isActive &&
      !!notebook.isSubscribed &&
      stores.policies.abilities(notebook.id).unsubscribe
    );
  },
  perform: async ({ getActiveModel, t }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    await notebook.unsubscribe();
    toast.success(t("Unsubscribed from document notifications"));
  },
});
export const archiveNotebook = createAction({
  name: ({ t }) => `${t("Archive")}…`,
  analyticsName: "Archive notebook",
  section: ActiveNotebookSection,
  icon: <ArchiveIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.archive),
  perform: async ({ getActiveModel, stores, t }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Archive notebook")} model={notebook} />,
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            await notebook.archive();
            toast.success(t("Notebook archived"));
          }}
          submitText={t("Archive")}
          savingText={`${t("Archiving")}…`}
        >
          {t(
            "Archiving this notebook will also archive all documents within it. Documents from the notebook will no longer be visible in search results."
          )}
        </ConfirmationDialog>
      ),
    });
  },
});
export const restoreNotebook = createAction({
  name: ({ t }) => t("Restore"),
  analyticsName: "Restore notebook",
  section: NotebookSection,
  icon: <RestoreIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.restore),
  perform: async ({ getActiveModel, t }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    await notebook.restore();
    toast.success(t("Notebook restored"));
  },
});
export const deleteNotebook = createAction({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Delete notebook",
  section: ActiveNotebookSection,
  dangerous: true,
  icon: <TrashIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.delete),
  perform: ({ getActiveModel, t, stores }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Delete notebook")} model={notebook} />,
      content: (
        <NotebookDeleteDialog
          notebook={notebook}
          onSubmit={stores.dialogs.closeAllModals}
        />
      ),
    });
  },
});
export const exportNotebook = createAction({
  name: ({ t }) => `${t("Export")}…`,
  analyticsName: "Export notebook",
  section: ActiveNotebookSection,
  icon: <ExportIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.export),
  perform: async ({ getActiveModel, stores, t }) => {
    const notebook = getActiveModel(Notebook);
    if (!notebook) {
      return;
    }
    stores.dialogs.openModal({
      title: <DialogTitle title={t("Export notebook")} model={notebook} />,
      content: (
        <ExportDialog
          notebook={notebook}
          onSubmit={stores.dialogs.closeAllModals}
        />
      ),
    });
  },
});
export const createNote = createInternalLinkAction({
  name: ({ t }) => t("New document"),
  analyticsName: "New document",
  section: ActiveNotebookSection,
  icon: <NewDocumentIcon />,
  keywords: "new create document",
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some((policy) => policy.abilities.createNote),
  to: ({ getActiveModel, sidebarContext }) => {
    const notebook = getActiveModel(Notebook);
    const [pathname, search] = newNotePath(notebook?.id).split("?");
    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});
export const createTemplate = createInternalLinkAction({
  name: ({ t }) => t("New template"),
  analyticsName: "New template",
  section: ActiveNotebookSection,
  icon: <ShapesIcon />,
  keywords: "new create template",
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Notebook).some(
      (policy) => policy.abilities.createTemplate
    ),
  to: ({ getActiveModel }) => {
    const notebook = getActiveModel(Notebook);
    return newTemplatePath(notebook?.id);
  },
});
export const rootNotebookActions = [
  openNotebook,
  openNotebookInSplit,
  createNotebook,
  duplicateNotebook,
  starNotebook,
  unstarNotebook,
  subscribeNotebook,
  unsubscribeNotebook,
  deleteNotebook,
];
