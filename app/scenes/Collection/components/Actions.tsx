import { observer } from "mobx-react";
import { MoreIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Collection from "~/models/Collection";
import { Action, Separator } from "~/components/Actions";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import usePolicy from "~/hooks/usePolicy";
import CollectionMenu from "~/menus/CollectionMenu";
import { newDocumentPath } from "~/utils/routeHelpers";

type Props = {
  collection: Collection;
};

function Actions({ collection }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(collection);

  return (
    <>
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
              >
                {t("New doc")}
              </Button>
            </Tooltip>
          </Action>
          <Separator />
        </>
      )}
      <Action>
        <CollectionMenu
          collection={collection}
          placement="bottom-end"
          label={(props) => (
            <Button
              aria-label={t("Collection menu")}
              icon={<MoreIcon />}
              {...props}
              borderOnHover
              neutral
            />
          )}
        />
      </Action>
    </>
  );
}

export default observer(Actions);
