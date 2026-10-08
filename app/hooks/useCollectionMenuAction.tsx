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
import { ActiveCollectionSection } from "~/actions/sections";

type Props = {
  /** Collection ID for which the actions are generated */
  collectionId: string;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
};

export function useCollectionMenuAction({ collectionId, onRename }: Props) {
  const actions = useMemo(
    () => [
      restoreCollection,
      starCollection,
      unstarCollection,
      subscribeCollection,
      unsubscribeCollection,
      ActionSeparator,
      createDocument,
      importDocument,
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
    [collectionId, onRename]
  );

  return useMenuAction(actions);
}
