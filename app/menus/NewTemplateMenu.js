// @flow
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import styled from "styled-components";
import Button from "components/Button";
import CollectionIcon from "components/CollectionIcon";
import ContextMenu from "components/ContextMenu";
import Header from "components/ContextMenu/Header";
import Template from "components/ContextMenu/Template";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import { newDocumentPath } from "utils/routeHelpers";

function NewTemplateMenu() {
  const menu = useMenuState({ modal: true });
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = policies.abilities(team.id);

  const items = React.useMemo(
    () =>
      collections.orderedData.reduce((filtered, collection) => {
        const can = policies.abilities(collection.id);
        if (can.update) {
          filtered.push({
            to: newDocumentPath(collection.id, { template: true }),
            title: <CollectionName>{collection.name}</CollectionName>,
            icon: <CollectionIcon collection={collection} />,
          });
        }
        return filtered;
      }, []),
    [collections.orderedData, policies]
  );

  if (!can.createDocument || items.length === 0) {
    return null;
  }

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button icon={<PlusIcon />} {...props} small>
            {t("New template")}…
          </Button>
        )}
      </MenuButton>
      <ContextMenu aria-label={t("New template")} {...menu}>
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

export default observer(NewTemplateMenu);
