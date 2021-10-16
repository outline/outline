// @flow
import { CollectionIcon } from "outline-icons";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import DynamicCollectionIcon from "components/CollectionIcon";
import { type Action } from "types";
import history from "utils/history";

export const openCollection: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Open collection"),
  section: ({ t }) => t("Collections"),
  shortcut: ["o", "c"],
  icon: <CollectionIcon />,
  children: ({ stores }) => {
    const collections = stores.collections.orderedData;

    return collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      icon: <DynamicCollectionIcon collection={collection} />,
      section: ({ t }) => t("Collections"),
      perform: () => history.push(collection.url),
    }));
  },
};

export const rootCollectionActions = [openCollection];
