// @flow
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import styled from "styled-components";
import Button from "components/Button";
import CollectionIcon from "components/CollectionIcon";
import ContextMenu from "components/ContextMenu";
import Header from "components/ContextMenu/Header";
import Template from "components/ContextMenu/Template";
import Flex from "components/Flex";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import { newDocumentUrl } from "utils/routeHelpers";

function NewTemplateMenu() {
  const menu = useMenuState({ modal: true });
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = policies.abilities(team.id);

  if (!can.createDocument) {
    return;
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
        <Template
          {...menu}
          items={collections.orderedData.map((collection) => ({
            to: newDocumentUrl(collection.id, {
              template: true,
            }),
            disabled: !policies.abilities(collection.id).update,
            title: (
              <Flex align="center">
                <CollectionIcon collection={collection} />
                <CollectionName>{collection.name}</CollectionName>
              </Flex>
            ),
          }))}
        />
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
