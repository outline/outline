import {
  CollectionIcon,
  EditIcon,
  PadlockIcon,
  PlusIcon,
  SearchIcon,
  ShapesIcon,
  StarredIcon,
  TrashIcon,
  UnstarredIcon,
} from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import Collection from "~/models/Collection";
import { CollectionEdit } from "~/components/Collection/CollectionEdit";
import { CollectionNew } from "~/components/Collection/CollectionNew";
import CollectionDeleteDialog from "~/components/CollectionDeleteDialog";
import DynamicCollectionIcon from "~/components/Icons/CollectionIcon";
import SharePopover from "~/components/Sharing/Collection/SharePopover";
import { getHeaderExpandedKey } from "~/components/Sidebar/components/Header";
import { createAction } from "~/actions";
import { CollectionSection } from "~/actions/sections";
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
  perform: ({ t, event }) => {
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
  section: CollectionSection,
  icon: <EditIcon />,
  visible: ({ activeCollectionId }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  perform: ({ t, activeCollectionId }) => {
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
  section: CollectionSection,
  icon: <PadlockIcon />,
  visible: ({ activeCollectionId }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  perform: ({ t, activeCollectionId }) => {
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
  section: CollectionSection,
  icon: <SearchIcon />,
  visible: ({ activeCollectionId }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).readDocument,
  perform: ({ activeCollectionId }) => {
    history.push(searchPath(undefined, { collectionId: activeCollectionId }));
  },
});

export const starCollection = createAction({
  name: ({ t }) => t("Star"),
  analyticsName: "Star collection",
  section: CollectionSection,
  icon: <StarredIcon />,
  keywords: "favorite bookmark",
  visible: ({ activeCollectionId }) => {
    if (!activeCollectionId) {
      return false;
    }
    const collection = stores.collections.get(activeCollectionId);
    return (
      !collection?.isStarred &&
      stores.policies.abilities(activeCollectionId).star
    );
  },
  perform: async ({ activeCollectionId }) => {
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
  section: CollectionSection,
  icon: <UnstarredIcon />,
  keywords: "unfavorite unbookmark",
  visible: ({ activeCollectionId }) => {
    if (!activeCollectionId) {
      return false;
    }
    const collection = stores.collections.get(activeCollectionId);
    return (
      !!collection?.isStarred &&
      stores.policies.abilities(activeCollectionId).unstar
    );
  },
  perform: async ({ activeCollectionId }) => {
    if (!activeCollectionId) {
      return;
    }

    const collection = stores.collections.get(activeCollectionId);
    await collection?.unstar();
  },
});

export const deleteCollection = createAction({
  name: ({ t }) => `${t("Delete")}…`,
  analyticsName: "Delete collection",
  section: CollectionSection,
  dangerous: true,
  icon: <TrashIcon />,
  visible: ({ activeCollectionId }) => {
    if (!activeCollectionId) {
      return false;
    }
    return stores.policies.abilities(activeCollectionId).delete;
  },
  perform: ({ activeCollectionId, t }) => {
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
  section: CollectionSection,
  icon: <ShapesIcon />,
  keywords: "new create template",
  visible: ({ activeCollectionId }) =>
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
  deleteCollection,
];
