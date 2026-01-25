import { observer } from "mobx-react";
import { EditIcon, PlusIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type Collection from "~/models/Collection";
import { Action, Separator } from "~/components/Actions";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import usePolicy from "~/hooks/usePolicy";
import CollectionMenu from "~/menus/CollectionMenu";
import {
  collectionEditPath,
  collectionPath,
  newDocumentPath,
} from "~/utils/routeHelpers";
import useCurrentUser from "~/hooks/useCurrentUser";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { CollectionTab } from "./Navigation";
import lazyWithRetry from "~/utils/lazyWithRetry";
import history from "~/utils/history";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import { useCallback } from "react";

const ShareButton = lazyWithRetry(() => import("./ShareButton"));

type Props = {
  /** The collection for which to render actions */
  collection: Collection;
  /** Whether the collection is in editing mode */
  isEditing: boolean;
  /** Contextual information for the sidebar */
  sidebarContext: SidebarContextType;
};

function Actions({ collection, isEditing, sidebarContext }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const user = useCurrentUser();

  const goToEdit = useCallback(() => {
    history.push({
      pathname: collectionEditPath(collection),
      state: { sidebarContext },
    });
  }, [collection, sidebarContext]);

  const goBack = useCallback(() => {
    history.push({
      pathname: collectionPath(collection, CollectionTab.Overview),
      state: { sidebarContext },
    });
  }, [collection, sidebarContext]);

  return (
    <>
      {(!isEditing || !user?.separateEditMode) && (
        <Action>
          <ShareButton collection={collection} />
        </Action>
      )}
      {!isEditing && user?.separateEditMode && (
        <Action>
          <RegisterKeyDown trigger="e" handler={goToEdit} />
          <Tooltip
            content={t("Edit collection")}
            shortcut="e"
            placement="bottom"
          >
            <Button icon={<EditIcon />} onClick={goToEdit} neutral>
              {t("Edit")}
            </Button>
          </Tooltip>
        </Action>
      )}
      {isEditing && user?.separateEditMode && (
        <Action>
          <RegisterKeyDown trigger="Escape" handler={goBack} />
          <Button onClick={goBack}>{t("Done editing")}</Button>
        </Action>
      )}
      {can.createDocument && (
        <>
          <Action>
            <Tooltip
              content={t("New document")}
              shortcut="n"
              placement="bottom"
            >
              <Button
                as={Link}
                to={collection ? newDocumentPath(collection.id) : ""}
                disabled={!collection}
                icon={<PlusIcon />}
                neutral={isEditing}
              >
                {t("New doc")}
              </Button>
            </Tooltip>
          </Action>
          <Separator />
        </>
      )}
      <Action>
        <CollectionMenu collection={collection} align="end" neutral />
      </Action>
    </>
  );
}

export default observer(Actions);
