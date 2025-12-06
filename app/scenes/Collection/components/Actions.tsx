import { observer } from "mobx-react";
import { EditIcon, PlusIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Collection from "~/models/Collection";
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
import { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { CollectionPath } from "./Navigation";
import lazyWithRetry from "~/utils/lazyWithRetry";

const ShareButton = lazyWithRetry(() => import("./ShareButton"));

type Props = {
  collection: Collection;
  isEditing: boolean;
  sidebarContext: SidebarContextType;
};

function Actions({ collection, isEditing, sidebarContext }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const user = useCurrentUser();

  return (
    <>
      {(!isEditing || !user?.separateEditMode) && (
        <Action>
          <ShareButton collection={collection} />
        </Action>
      )}
      {!isEditing && user?.separateEditMode && (
        <Action>
          <Tooltip
            content={t("Edit collection")}
            shortcut="e"
            placement="bottom"
          >
            <Button
              as={Link}
              icon={<EditIcon />}
              to={{
                pathname: collectionEditPath(collection),
                state: { sidebarContext },
              }}
              neutral
            >
              {t("Edit")}
            </Button>
          </Tooltip>
        </Action>
      )}
      {isEditing && user?.separateEditMode && (
        <Action>
          <Button
            as={Link}
            to={{
              pathname: collectionPath(collection, CollectionPath.Overview),
              state: { sidebarContext },
            }}
          >
            {t("Done editing")}
          </Button>
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
