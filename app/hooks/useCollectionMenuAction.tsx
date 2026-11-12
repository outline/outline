import { useMemo } from "react";
import { useMenuAction } from "./useMenuAction";
import { ActionSeparator } from "~/actions";
import {
  deleteCollection,
  duplicateCollection,
  editCollection,
  editCollectionPermissions,
  starCollection,
  unstarCollection,
  searchInCollection,
  createTemplate,
  archiveCollection,
  restoreCollection,
  subscribeCollection,
  unsubscribeCollection,
  createDocument,
  exportCollection,
  importDocument,
  openCollectionInSplit,
  sortCollection,
} from "~/actions/definitions/collections";
import { renameActionFactory } from "~/actions/definitions/common";
import { addLinkToCollection } from "~/actions/definitions/links";
import { ActiveCollectionSection } from "~/actions/sections";

type Props = {
  /** Collection ID for which the actions are generated */
  collectionId: string;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
  /** Whether the menu is shown in the sidebar, where links can be added */
  isSidebar?: boolean;
};

export function useCollectionMenuAction({
  collectionId,
  onRename,
  isSidebar = false,
}: Props) {
  const actions = useMemo(
    () => [
      // Actions that add to the tree of the collection, not change it.
      createDocument,
      ...(isSidebar ? [addLinkToCollection] : []),
      importDocument,
      ActionSeparator,
      restoreCollection,
      starCollection,
      unstarCollection,
      subscribeCollection,
      unsubscribeCollection,
      ActionSeparator,
      renameActionFactory({
        section: ActiveCollectionSection,
        modelId: collectionId,
        onRename,
      }),
      editCollection,
      editCollectionPermissions,
      createTemplate,
      duplicateCollection,
      sortCollection,
      exportCollection,
      archiveCollection,
      openCollectionInSplit,
      searchInCollection,
      ActionSeparator,
      deleteCollection,
    ],
    [collectionId, onRename, isSidebar]
  );

  return useMenuAction(actions);
}
