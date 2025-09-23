import { useMemo } from "react";
import { useMenuAction } from "./useMenuAction";
import { ActionV2Separator, createActionV2 } from "~/actions";
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
      ActionV2Separator,
      createDocument,
      importDocument,
      ActionV2Separator,
      createActionV2({
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
      ActionV2Separator,
      deleteCollection,
    ],
    [t, can.createDocument, can.update, onRename]
  );

  return useMenuAction(actions);
}
