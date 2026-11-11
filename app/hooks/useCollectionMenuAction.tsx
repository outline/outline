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
  addLinkToCollection,
  exportCollection,
  importDocument,
  openCollectionInSplit,
  sortCollection,
} from "~/actions/definitions/collections";
import { renameActionFactory } from "~/actions/definitions/common";
import { ActiveCollectionSection } from "~/actions/sections";

type Props = {
  /** Collection ID for which the actions are generated */
  collectionId: string;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
  /** Whether to include the action that adds a link, used in the sidebar */
  showLinkActions?: boolean;
};

export function useCollectionMenuAction({
  collectionId,
  onRename,
  showLinkActions = false,
}: Props) {
  const actions = useMemo(
    () => [
      // Actions that add to the tree of the collection, not change it.
      createDocument,
      ...(showLinkActions ? [addLinkToCollection] : []),
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
    [collectionId, onRename, showLinkActions]
  );

  return useMenuAction(actions);
}
