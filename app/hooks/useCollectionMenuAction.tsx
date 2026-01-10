import { useMemo } from "react";
import { useMenuAction } from "./useMenuAction";
import { ActionSeparator, createAction } from "~/actions";
import {
  deleteCollection,
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
  sortCollection,
} from "~/actions/definitions/collections";
import { ActiveCollectionSection } from "~/actions/sections";
import { InputIcon } from "outline-icons";
import usePolicy from "./usePolicy";
import useStores from "./useStores";
import { useTranslation } from "react-i18next";

type Props = {
  /** Collection ID for which the actions are generated */
  collectionId: string;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
};

export function useCollectionMenuAction({ collectionId, onRename }: Props) {
  const { collections } = useStores();
  const { t } = useTranslation();
  const collection = collections.get(collectionId);
  const can = usePolicy(collection);

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
      createAction({
        name: `${t("Rename")}…`,
        section: ActiveCollectionSection,
        icon: <InputIcon />,
        visible: !!can.update && !!onRename,
        perform: () => requestAnimationFrame(() => onRename?.()),
      }),
      editCollection,
      editCollectionPermissions,
      createTemplate,
      sortCollection,
      exportCollection,
      archiveCollection,
      searchInCollection,
      ActionSeparator,
      deleteCollection,
    ],
    [t, can.createDocument, can.update, onRename]
  );

  return useMenuAction(actions);
}
