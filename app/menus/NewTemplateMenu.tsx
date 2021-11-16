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
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { newDocumentPath } from "utils/routeHelpers";

function NewTemplateMenu() {
  const menu = useMenuState({
    modal: true,
  });
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = policies.abilities(team.id);
  const items = React.useMemo(
    () =>
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'filtered' implicitly has an 'any' type.
      collections.orderedData.reduce((filtered, collection) => {
        const can = policies.abilities(collection.id);

        if (can.update) {
          filtered.push({
            to: newDocumentPath(collection.id, {
              template: true,
            }),
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
          // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
          <Button icon={<PlusIcon />} {...props} small>
            {t("New template")}…
          </Button>
        )}
      </MenuButton>
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element[]; baseId: string; unsta... Remove this comment to see the full error message
      <ContextMenu aria-label={t("New template")} {...menu}>
        <Header>{t("Choose a collection")}</Header>
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'actions' is missing in type '{ items: an... Remove this comment to see the full error message
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
