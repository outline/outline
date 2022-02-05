import { CollectionIcon, EditIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import CollectionEdit from "~/scenes/CollectionEdit";
import CollectionNew from "~/scenes/CollectionNew";
import DynamicCollectionIcon from "~/components/CollectionIcon";
import { createAction } from "~/actions";
import { CollectionSection } from "~/actions/sections";
import history from "~/utils/history";

export const openCollection = createAction({
  name: ({ t }) => t("Open collection"),
  section: CollectionSection,
  shortcut: ["o", "c"],
  icon: <CollectionIcon />,
  children: ({ stores }) => {
    const collections = stores.collections.orderedData;
    return collections.map((collection) => ({
      // Note: using url which includes the slug rather than id here to bust
      // cache if the collection is renamed
      id: collection.url,
      name: collection.name,
      icon: <DynamicCollectionIcon collection={collection} />,
      section: CollectionSection,
      perform: () => history.push(collection.url),
    }));
  },
});

export const createCollection = createAction({
  name: ({ t }) => t("New collection"),
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
  name: ({ t }) => t("Edit collection"),
  section: CollectionSection,
  icon: <EditIcon />,
  visible: ({ stores, activeCollectionId }) =>
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

export const rootCollectionActions = [openCollection, createCollection];
