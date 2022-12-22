import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MenuButton, useMenuState } from "reakit/Menu";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import Header from "~/components/ContextMenu/Header";
import Template from "~/components/ContextMenu/Template";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Tooltip from "~/components/Tooltip";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { MenuItem } from "~/types";
import { newDocumentPath } from "~/utils/routeHelpers";

const ColorCollectionIcon = ({ collection }: { collection: Collection }) => {
  return <CollectionIcon collection={collection} />;
};

function NewDocumentMenu() {
  const menu = useMenuState({
    modal: true,
  });
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = usePolicy(team);
  const items = React.useMemo(
    () =>
      collections.orderedData.reduce<MenuItem[]>((filtered, collection) => {
        const can = policies.abilities(collection.id);

        if (can.update) {
          filtered.push({
            type: "route",
            to: newDocumentPath(collection.id),
            title: <CollectionName>{collection.name}</CollectionName>,
            icon: <ColorCollectionIcon collection={collection} />,
          });
        }

        return filtered;
      }, []),
    [collections.orderedData, policies]
  );

  if (!can.createDocument) {
    return null;
  }

  return env.PUBLISH_UI_ENABLED ? (
    <>
      <Tooltip
        tooltip={t("New document")}
        shortcut="n"
        delay={500}
        placement="bottom"
      >
        <Button as={Link} to={newDocumentPath()} icon={<PlusIcon />}>
          {t("New doc")}
        </Button>
      </Tooltip>
    </>
  ) : (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button icon={<PlusIcon />} disabled={items.length === 0} {...props}>
            {`${t("New doc")}…`}
          </Button>
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("New document")}>
        <Header>{t("Choose a collection")}</Header>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}

const CollectionName = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export default observer(NewDocumentMenu);
