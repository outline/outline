import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import Button from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import TeamLogo from "~/components/TeamLogo";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { MenuItem } from "~/types";
import { newTemplatePath } from "~/utils/routeHelpers";

function NewTemplateMenu() {
  const menu = useMenuState({
    modal: true,
  });
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = usePolicy(team);
  React.useEffect(() => {
    void collections.fetchPage({
      limit: 100,
    });
  }, [collections]);

  const workspaceItem: MenuItem | null = can.createTemplate
    ? {
        type: "route",
        to: newTemplatePath(),
        title: t("Save in workspace"),
        icon: <TeamLogo model={team} />,
      }
    : null;

  const collectionItems = React.useMemo(
    () =>
      collections.orderedData.reduce<MenuItem[]>((filtered, collection) => {
        const can = policies.abilities(collection.id);

        if (can.createDocument) {
          filtered.push({
            type: "route",
            to: newTemplatePath(collection.id),
            title: collection.name,
            icon: <CollectionIcon collection={collection} />,
          });
        }

        return filtered;
      }, []),
    [collections.orderedData, policies]
  );

  const collectionItemsWithHeader: MenuItem[] = React.useMemo(
    () =>
      collectionItems.length
        ? [
            { type: "heading", title: t("Choose a collection") },
            ...collectionItems,
          ]
        : [],
    [t, collectionItems]
  );

  const items = workspaceItem
    ? collectionItemsWithHeader.length
      ? [
          workspaceItem,
          { type: "separator" } as MenuItem,
          ...collectionItemsWithHeader,
        ]
      : [workspaceItem]
    : collectionItemsWithHeader;

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button icon={<PlusIcon />} {...props}>
            {t("New template")}…
          </Button>
        )}
      </MenuButton>
      <ContextMenu aria-label={t("New template")} {...menu}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}

export default observer(NewTemplateMenu);
