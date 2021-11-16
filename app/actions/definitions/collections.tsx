import { CollectionIcon, EditIcon, PlusIcon } from "outline-icons";
import * as React from "react";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'stores' or its corresponding t... Remove this comment to see the full error message
import stores from "stores";
import CollectionEdit from "scenes/CollectionEdit";
import CollectionNew from "scenes/CollectionNew";
import DynamicCollectionIcon from "components/CollectionIcon";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions' or its corresponding ... Remove this comment to see the full error message
import { createAction } from "actions";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions/sections' or its corre... Remove this comment to see the full error message
import { CollectionSection } from "actions/sections";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/history' or its correspo... Remove this comment to see the full error message
import history from "utils/history";

export const openCollection = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Open collection"),
  section: CollectionSection,
  shortcut: ["o", "c"],
  icon: <CollectionIcon />,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'stores' implicitly has an 'any' t... Remove this comment to see the full error message
  children: ({ stores }) => {
    const collections = stores.collections.orderedData;
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'collection' implicitly has an 'any' typ... Remove this comment to see the full error message
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
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("New collection"),
  section: CollectionSection,
  icon: <PlusIcon />,
  keywords: "create",
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'stores' implicitly has an 'any' t... Remove this comment to see the full error message
  visible: ({ stores }) =>
    stores.policies.abilities(stores.auth.team?.id || "").createCollection,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
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
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Edit collection"),
  section: CollectionSection,
  icon: <EditIcon />,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'stores' implicitly has an 'any' t... Remove this comment to see the full error message
  visible: ({ stores, activeCollectionId }) =>
    !!activeCollectionId &&
    stores.policies.abilities(activeCollectionId).update,
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  perform: ({ t, activeCollectionId }) => {
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
