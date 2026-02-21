import {
  SortAlphabeticalReverseIcon,
  SortAlphabeticalIcon,
  ArchiveIcon,
  CollectionIcon,
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
  createInternalLinkAction,
  createActionWithChildren,
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
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some((policy) => policy.abilities.update),
  perform: ({ t, getActiveModel, stores }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Edit collection"),
      content: (
        <CollectionEdit
          onSubmit={stores.dialogs.closeAllModals}
          collectionId={collection.id}
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
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some((policy) => policy.abilities.update),
  perform: ({ t, getActiveModel, stores }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Share this collection"),
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
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some(
      (policy) => policy.abilities.createDocument
    ),
  perform: ({ t, getActiveModel, stores }) => {
    const { documents } = stores;
    const collection = getActiveModel(Collection);
    if (!collection) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = documents.importFileTypesString;

    input.onchange = async (ev) => {
      const files = getEventFiles(ev);
      const file = files[0];
      const toastId = toast.loading(`${t("Uploading")}…`);

      try {
        const document = await documents.import(file, null, collection.id, {
          publish: true,
        });
        history.push(document.path);
      } catch (err) {
        toast.error(err.message);
      } finally {
        toast.dismiss(toastId);
      }
    };

    input.click();
  },
});

export const sortCollection = createActionWithChildren({
  name: ({ t }) => t("Sort in sidebar"),
  section: ActiveCollectionSection,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some((policy) => policy.abilities.update),
  icon: ({ getActiveModel }) => {
    const collection = getActiveModel(Collection);
    const sortAlphabetical = collection?.sort.field === "title";
    const sortDir = collection?.sort.direction;

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
      section: ActiveCollectionSection,
      selected: ({ getActiveModel }) => {
        const collection = getActiveModel(Collection);
        return (
          collection?.sort.field === "title" &&
          collection?.sort.direction === "asc"
        );
      },
      perform: ({ getActiveModel }) => {
        const collection = getActiveModel(Collection);
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
      selected: ({ getActiveModel }) => {
        const collection = getActiveModel(Collection);
        return (
          collection?.sort.field === "title" &&
          collection?.sort.direction === "desc"
        );
      },
      perform: ({ getActiveModel }) => {
        const collection = getActiveModel(Collection);
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
      selected: ({ getActiveModel }) => {
        const collection = getActiveModel(Collection);
        return collection?.sort.field !== "title";
      },
      perform: ({ getActiveModel }) => {
        const collection = getActiveModel(Collection);
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
  visible: ({ getActiveModel, stores }) => {
    const collection = getActiveModel(Collection);
    if (!collection?.isActive) {
      return false;
    }

    return stores.policies.abilities(collection.id).readDocument;
  },
  to: ({ getActiveModel, sidebarContext }) => {
    const collection = getActiveModel(Collection);

    const [pathname, search] = searchPath({
      collectionId: collection?.id,
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
  visible: ({ getActiveModel, stores }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return false;
    }

    return (
      !collection.isStarred && stores.policies.abilities(collection.id).star
    );
  },
  perform: async ({ getActiveModel }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return;
    }
    await collection.star();
    setPersistedState(getHeaderExpandedKey("starred"), true);
  },
});

export const unstarCollection = createAction({
  name: ({ t }) => t("Unstar"),
  analyticsName: "Unstar collection",
  section: ActiveCollectionSection,
  icon: <UnstarredIcon />,
  keywords: "unfavorite unbookmark",
  visible: ({ getActiveModel, stores }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return false;
    }

    return (
      !!collection.isStarred && stores.policies.abilities(collection.id).unstar
    );
  },
  perform: async ({ getActiveModel }) => {
    const collection = getActiveModel(Collection);
    await collection?.unstar();
  },
});

export const subscribeCollection = createAction({
  name: ({ t }) => t("Subscribe"),
  analyticsName: "Subscribe to collection",
  section: ActiveCollectionSection,
  icon: <SubscribeIcon />,
  visible: ({ getActiveModel, stores }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return false;
    }

    return (
      !!collection.isActive &&
      !collection.isSubscribed &&
      stores.policies.abilities(collection.id).subscribe
    );
  },
  perform: async ({ getActiveModel, t }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return;
    }

    await collection.subscribe();
    toast.success(t("Subscribed to document notifications"));
  },
});

export const unsubscribeCollection = createAction({
  name: ({ t }) => t("Unsubscribe"),
  analyticsName: "Unsubscribe from collection",
  section: ActiveCollectionSection,
  icon: <UnsubscribeIcon />,
  visible: ({ getActiveModel, stores }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return false;
    }

    return (
      !!collection.isActive &&
      !!collection.isSubscribed &&
      stores.policies.abilities(collection.id).unsubscribe
    );
  },
  perform: async ({ getActiveModel, t }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return;
    }

    await collection.unsubscribe();
    toast.success(t("Unsubscribed from document notifications"));
  },
});

export const archiveCollection = createAction({
  name: ({ t }) => `${t("Archive")}…`,
  analyticsName: "Archive collection",
  section: ActiveCollectionSection,
  icon: <ArchiveIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some((policy) => policy.abilities.archive),
  perform: async ({ getActiveModel, stores, t }) => {
    const collection = getActiveModel(Collection);
    if (!collection) {
      return;
    }

    stores.dialogs.openModal({
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
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some((policy) => policy.abilities.restore),
  perform: async ({ getActiveModel, t }) => {
    const collection = getActiveModel(Collection);
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
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some((policy) => policy.abilities.delete),
  perform: ({ getActiveModel, t, stores }) => {
    const collection = getActiveModel(Collection);
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
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some((policy) => policy.abilities.export),
  perform: async ({ getActiveModel, stores, t }) => {
    const collection = getActiveModel(Collection);
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
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some(
      (policy) => policy.abilities.createDocument
    ),
  to: ({ getActiveModel, sidebarContext }) => {
    const collection = getActiveModel(Collection);
    const [pathname, search] = newDocumentPath(collection?.id).split("?");

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
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Collection).some(
      (policy) => policy.abilities.createDocument
    ),
  to: ({ getActiveModel }) => {
    const collection = getActiveModel(Collection);
    return newTemplatePath(collection?.id);
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
