import {
  AlphabeticalReverseSortIcon,
  AlphabeticalSortIcon,
  ArchiveIcon,
  CollectionIcon,
  EditIcon,
  ExportIcon,
  ImportIcon,
  ManualSortIcon,
  NewDocumentIcon,
  PadlockIcon,
  PlusIcon,
  RestoreIcon,
  SearchIcon,
  ShapesIcon,
  StarredIcon,
  SubscribeIcon,
  TrashIcon,
  UnstarredIcon,
  UnsubscribeIcon,
} from "outline-icons";
import { toast } from "sonner";
import Collection from "~/models/Collection";
import { CollectionEdit } from "~/components/Collection/CollectionEdit";
import { CollectionNew } from "~/components/Collection/CollectionNew";
import CollectionDeleteDialog from "~/components/CollectionDeleteDialog";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DynamicCollectionIcon from "~/components/Icons/CollectionIcon";
import { getHeaderExpandedKey } from "~/components/Sidebar/components/Header";
import {
  createAction,
  createActionWithChildren,
  createInternalLinkAction,
} from "~/actions";
import { ActiveCollectionSection, CollectionSection } from "~/actions/sections";
import { setPersistedState } from "~/hooks/usePersistedState";
import {
  newDocumentPath,
  newTemplatePath,
  searchPath,
} from "~/utils/routeHelpers";
import ExportDialog from "~/components/ExportDialog";
import { getEventFiles } from "@shared/utils/files";
import history from "~/utils/history";
import lazyWithRetry from "~/utils/lazyWithRetry";

const ColorCollectionIcon = ({ collection }: { collection: Collection }) => (
  <DynamicCollectionIcon collection={collection} />
);
const SharePopover = lazyWithRetry(
  () => import("~/components/Sharing/Collection/SharePopover")
);

export const openCollection = createActionWithChildren({
  name: ({ t }) => t("Open collection"),
  analyticsName: "Open collection",
  section: CollectionSection,
  shortcut: ["o", "c"],
  icon: <CollectionIcon />,
  children: ({ stores }) => {
    const collections = stores.collections.orderedData;
    return collections.map((collection) =>
      createInternalLinkAction({
        // Note: using url which includes the slug rather than id here to bust
        // cache if the collection is renamed
        id: collection.path,
        name: collection.name,
        icon: <ColorCollectionIcon collection={collection} />,
        section: CollectionSection,
        to: collection.path,
      })
    );
  },
});

export const createCollection = createAction({
  name: ({ t }) => t("New collection"),
  analyticsName: "New collection",
  section: CollectionSection,
  icon: <PlusIcon />,
  keywords: "create",
  visible: ({ stores }) =>
    stores.policies.abilities(stores.auth.team?.id || "").createCollection,
  perform: ({ t, event, stores }) => {
    event?.preventDefault();
    event?.stopPropagation();
    stores.dialogs.openModal({
      title: t("Create a collection"),
      content: <CollectionNew onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});

export const editCollection = createAction({
  name: ({ t, isMenu }) => (isMenu ? `${t("Edit")}…` : t("Edit collection")),
  analyticsName: "Edit collection",
  section: ActiveCollectionSection,
  icon: <EditIcon />,
  visible: ({ activeCollectionId, stores }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  perform: ({ t, activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Edit collection"),
      content: (
        <CollectionEdit
          onSubmit={stores.dialogs.closeAllModals}
          collectionId={activeCollectionId}
        />
      ),
    });
  },
});

export const editCollectionPermissions = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Permissions")}…` : t("Collection permissions"),
  analyticsName: "Collection permissions",
  section: ActiveCollectionSection,
  icon: <PadlockIcon />,
  visible: ({ activeCollectionId, stores }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  perform: ({ t, activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return;
    }
    const collection = stores.collections.get(activeCollectionId);
    if (!collection) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Share this collection"),
      style: { marginBottom: -12 },
      content: (
        <SharePopover
          collection={collection}
          onRequestClose={stores.dialogs.closeAllModals}
          visible
        />
      ),
    });
  },
});

export const importDocument = createAction({
  name: ({ t }) => t("Import document"),
  analyticsName: "Import document",
  section: ActiveCollectionSection,
  icon: <ImportIcon />,
  visible: ({ activeCollectionId, stores }) => {
    if (activeCollectionId) {
      return !!stores.policies.abilities(activeCollectionId).createDocument;
    }

    return false;
  },
  perform: ({ activeCollectionId, stores }) => {
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
          null,
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

export const sortCollection = createActionWithChildren({
  name: ({ t }) => t("Sort in sidebar"),
  section: ActiveCollectionSection,
  visible: ({ activeCollectionId, stores }) =>
    !!activeCollectionId &&
    !!stores.policies.abilities(activeCollectionId).update,
  icon: ({ activeCollectionId, stores }) => {
    const collection = stores.collections.get(activeCollectionId);
    const sortAlphabetical = collection?.sort.field === "title";
    const sortDir = collection?.sort.direction;

    return sortAlphabetical ? (
      sortDir === "asc" ? (
        <AlphabeticalSortIcon />
      ) : (
        <AlphabeticalReverseSortIcon />
      )
    ) : (
      <ManualSortIcon />
    );
  },
  children: [
    createAction({
      name: ({ t }) => t("A-Z sort"),
      section: ActiveCollectionSection,
      selected: ({ activeCollectionId, stores }) => {
        const collection = stores.collections.get(activeCollectionId);
        return (
          collection?.sort.field === "title" &&
          collection?.sort.direction === "asc"
        );
      },
      perform: ({ activeCollectionId, stores }) => {
        const collection = stores.collections.get(activeCollectionId);
        return collection?.save({
          sort: {
            field: "title",
            direction: "asc",
          },
        });
      },
    }),
    createAction({
      name: ({ t }) => t("Z-A sort"),
      section: ActiveCollectionSection,
      selected: ({ activeCollectionId, stores }) => {
        const collection = stores.collections.get(activeCollectionId);
        return (
          collection?.sort.field === "title" &&
          collection?.sort.direction === "desc"
        );
      },
      perform: ({ activeCollectionId, stores }) => {
        const collection = stores.collections.get(activeCollectionId);
        return collection?.save({
          sort: {
            field: "title",
            direction: "desc",
          },
        });
      },
    }),
    createAction({
      name: ({ t }) => t("Manual sort"),
      section: ActiveCollectionSection,
      selected: ({ activeCollectionId, stores }) => {
        const collection = stores.collections.get(activeCollectionId);
        return collection?.sort.field !== "title";
      },
      perform: ({ activeCollectionId, stores }) => {
        const collection = stores.collections.get(activeCollectionId);
        return collection?.save({
          sort: {
            field: "index",
            direction: "asc",
          },
        });
      },
    }),
  ],
});

export const searchInCollection = createInternalLinkAction({
  name: ({ t }) => t("Search in collection"),
  analyticsName: "Search collection",
  section: ActiveCollectionSection,
  icon: <SearchIcon />,
  visible: ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return false;
    }

    const collection = stores.collections.get(activeCollectionId);

    if (!collection?.isActive) {
      return false;
    }

    return stores.policies.abilities(activeCollectionId).readDocument;
  },
  to: ({ activeCollectionId, sidebarContext }) => {
    const [pathname, search] = searchPath({
      collectionId: activeCollectionId,
    }).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const starCollection = createAction({
  name: ({ t }) => t("Star"),
  analyticsName: "Star collection",
  section: ActiveCollectionSection,
  icon: <StarredIcon />,
  keywords: "favorite bookmark",
  visible: ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return false;
    }
    const collection = stores.collections.get(activeCollectionId);
    return (
      !collection?.isStarred &&
      stores.policies.abilities(activeCollectionId).star
    );
  },
  perform: async ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return;
    }

    const collection = stores.collections.get(activeCollectionId);
    await collection?.star();
    setPersistedState(getHeaderExpandedKey("starred"), true);
  },
});

export const unstarCollection = createAction({
  name: ({ t }) => t("Unstar"),
  analyticsName: "Unstar collection",
  section: ActiveCollectionSection,
  icon: <UnstarredIcon />,
  keywords: "unfavorite unbookmark",
  visible: ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return false;
    }
    const collection = stores.collections.get(activeCollectionId);
    return (
      !!collection?.isStarred &&
      stores.policies.abilities(activeCollectionId).unstar
    );
  },
  perform: async ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return;
    }

    const collection = stores.collections.get(activeCollectionId);
    await collection?.unstar();
  },
});

export const subscribeCollection = createAction({
  name: ({ t }) => t("Subscribe"),
  analyticsName: "Subscribe to collection",
  section: ActiveCollectionSection,
  icon: <SubscribeIcon />,
  visible: ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return false;
    }

    const collection = stores.collections.get(activeCollectionId);

    return (
      !!collection?.isActive &&
      !collection?.isSubscribed &&
      stores.policies.abilities(activeCollectionId).subscribe
    );
  },
  perform: async ({ activeCollectionId, stores, t }) => {
    if (!activeCollectionId) {
      return;
    }

    const collection = stores.collections.get(activeCollectionId);

    await collection?.subscribe();

    toast.success(t("Subscribed to document notifications"));
  },
});

export const unsubscribeCollection = createAction({
  name: ({ t }) => t("Unsubscribe"),
  analyticsName: "Unsubscribe from collection",
  section: ActiveCollectionSection,
  icon: <UnsubscribeIcon />,
  visible: ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return false;
    }

    const collection = stores.collections.get(activeCollectionId);

    return (
      !!collection?.isActive &&
      !!collection?.isSubscribed &&
      stores.policies.abilities(activeCollectionId).unsubscribe
    );
  },
  perform: async ({ activeCollectionId, currentUserId, stores, t }) => {
    if (!activeCollectionId || !currentUserId) {
      return;
    }

    const collection = stores.collections.get(activeCollectionId);

    await collection?.unsubscribe();

    toast.success(t("Unsubscribed from document notifications"));
  },
});

export const archiveCollection = createAction({
  name: ({ t }) => `${t("Archive")}…`,
  analyticsName: "Archive collection",
  section: ActiveCollectionSection,
  icon: <ArchiveIcon />,
  visible: ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return false;
    }
    return !!stores.policies.abilities(activeCollectionId).archive;
  },
  perform: async ({ activeCollectionId, stores, t }) => {
    const { dialogs, collections } = stores;
    if (!activeCollectionId) {
      return;
    }
    const collection = collections.get(activeCollectionId);
    if (!collection) {
      return;
    }

    dialogs.openModal({
      title: t("Archive collection"),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            await collection.archive();
            toast.success(t("Collection archived"));
          }}
          submitText={t("Archive")}
          savingText={`${t("Archiving")}…`}
        >
          {t(
            "Archiving this collection will also archive all documents within it. Documents from the collection will no longer be visible in search results."
          )}
        </ConfirmationDialog>
      ),
    });
  },
});

export const restoreCollection = createAction({
  name: ({ t }) => t("Restore"),
  analyticsName: "Restore collection",
  section: CollectionSection,
  icon: <RestoreIcon />,
  visible: ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return false;
    }
    return !!stores.policies.abilities(activeCollectionId).restore;
  },
  perform: async ({ activeCollectionId, stores, t }) => {
    if (!activeCollectionId) {
      return;
    }
    const collection = stores.collections.get(activeCollectionId);
    if (!collection) {
      return;
    }

    await collection.restore();
    toast.success(t("Collection restored"));
  },
});

export const deleteCollection = createAction({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Delete collection",
  section: ActiveCollectionSection,
  dangerous: true,
  icon: <TrashIcon />,
  visible: ({ activeCollectionId, stores }) => {
    if (!activeCollectionId) {
      return false;
    }
    return stores.policies.abilities(activeCollectionId).delete;
  },
  perform: ({ activeCollectionId, t, stores }) => {
    if (!activeCollectionId) {
      return;
    }

    const collection = stores.collections.get(activeCollectionId);
    if (!collection) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Delete collection"),
      content: (
        <CollectionDeleteDialog
          collection={collection}
          onSubmit={stores.dialogs.closeAllModals}
        />
      ),
    });
  },
});

export const exportCollection = createAction({
  name: ({ t }) => `${t("Export")}…`,
  analyticsName: "Export collection",
  section: ActiveCollectionSection,
  icon: <ExportIcon />,
  visible: ({ currentTeamId, activeCollectionId, stores }) => {
    if (!currentTeamId || !activeCollectionId) {
      return false;
    }

    return !!stores.policies.abilities(activeCollectionId).export;
  },
  perform: async ({ activeCollectionId, stores, t }) => {
    if (!activeCollectionId) {
      return;
    }
    const collection = stores.collections.get(activeCollectionId);
    if (!collection) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Export collection"),
      content: (
        <ExportDialog
          collection={collection}
          onSubmit={stores.dialogs.closeAllModals}
        />
      ),
    });
  },
});

export const createDocument = createInternalLinkAction({
  name: ({ t }) => t("New document"),
  analyticsName: "New document",
  section: ActiveCollectionSection,
  icon: <NewDocumentIcon />,
  keywords: "new create document",
  visible: ({ activeCollectionId, stores }) =>
    !!(
      !!activeCollectionId &&
      stores.policies.abilities(activeCollectionId).createDocument
    ),
  to: ({ activeCollectionId, sidebarContext }) => {
    const [pathname, search] = newDocumentPath(activeCollectionId).split("?");

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
  section: ActiveCollectionSection,
  icon: <ShapesIcon />,
  keywords: "new create template",
  visible: ({ activeCollectionId, stores }) =>
    !!(
      !!activeCollectionId &&
      stores.policies.abilities(activeCollectionId).createDocument
    ),
  to: ({ activeCollectionId, sidebarContext }) => {
    const [pathname, search] = newTemplatePath(activeCollectionId).split("?");

    return {
      pathname,
      search,
      state: { sidebarContext },
    };
  },
});

export const rootCollectionActions = [
  openCollection,
  createCollection,
  starCollection,
  unstarCollection,
  subscribeCollection,
  unsubscribeCollection,
  deleteCollection,
];
