import {
  ArchiveIcon,
  CollectionIcon,
  EditIcon,
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
import * as React from "react";
import { toast } from "sonner";
import Collection from "~/models/Collection";
import { CollectionEdit } from "~/components/Collection/CollectionEdit";
import { CollectionNew } from "~/components/Collection/CollectionNew";
import CollectionDeleteDialog from "~/components/CollectionDeleteDialog";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DynamicCollectionIcon from "~/components/Icons/CollectionIcon";
import SharePopover from "~/components/Sharing/Collection/SharePopover";
import { getHeaderExpandedKey } from "~/components/Sidebar/components/Header";
import { createAction } from "~/actions";
import { ActiveCollectionSection, CollectionSection } from "~/actions/sections";
import { setPersistedState } from "~/hooks/usePersistedState";
import history from "~/utils/history";
import { newTemplatePath, searchPath } from "~/utils/routeHelpers";

const ColorCollectionIcon = ({ collection }: { collection: Collection }) => (
  <DynamicCollectionIcon collection={collection} />
);

export const openCollection = createAction({
  name: ({ t }) => t("Open collection"),
  analyticsName: "Open collection",
  section: CollectionSection,
  shortcut: ["o", "c"],
  icon: <CollectionIcon />,
  children: ({ stores }) => {
    const collections = stores.collections.orderedData;
    return collections.map((collection) => ({
      // Note: using url which includes the slug rather than id here to bust
      // cache if the collection is renamed
      id: collection.path,
      name: collection.name,
      icon: <ColorCollectionIcon collection={collection} />,
      section: CollectionSection,
      perform: () => history.push(collection.path),
    }));
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
  name: ({ t, isContextMenu }) =>
    isContextMenu ? `${t("Edit")}…` : t("Edit collection"),
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
  name: ({ t, isContextMenu }) =>
    isContextMenu ? `${t("Permissions")}…` : t("Collection permissions"),
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

export const searchInCollection = createAction({
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

  perform: ({ activeCollectionId }) => {
    history.push(searchPath(undefined, { collectionId: activeCollectionId }));
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
  section: CollectionSection,
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

export const createTemplate = createAction({
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
  perform: ({ activeCollectionId, event }) => {
    if (!activeCollectionId) {
      return;
    }
    event?.preventDefault();
    event?.stopPropagation();
    history.push(newTemplatePath(activeCollectionId));
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
