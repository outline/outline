import { observer } from "mobx-react";
import { AlphabeticalSortIcon, ManualSortIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import Collection from "models/Collection";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import NudeButton from "components/NudeButton";

type Props = {
  collection: Collection;
  onOpen?: () => void;
  onClose?: () => void;
};

function CollectionSortMenu({ collection, onOpen, onClose, ...rest }: Props) {
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });
  const handleChangeSort = React.useCallback(
    (field: string) => {
      menu.hide();
      return collection.save({
        sort: {
          field,
          direction: "asc",
        },
      });
    },
    [collection, menu]
  );
  const alphabeticalSort = collection.sort.field === "title";
  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <NudeButton aria-label={t("Show sort menu")} {...props}>
            {alphabeticalSort ? <AlphabeticalSortIcon /> : <ManualSortIcon />}
          </NudeButton>
        )}
      </MenuButton>
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element; onOpen: (() => void) | ... Remove this comment to see the full error message
      <ContextMenu
        {...menu}
        onOpen={onOpen}
        onClose={onClose}
        aria-label={t("Sort in sidebar")}
      >
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'actions' is missing in type '{ items: { ... Remove this comment to see the full error message
        <Template
          {...menu}
          items={[
            {
              title: t("Alphabetical sort"),
              onClick: () => handleChangeSort("title"),
              selected: alphabeticalSort,
            },
            {
              title: t("Manual sort"),
              onClick: () => handleChangeSort("index"),
              selected: !alphabeticalSort,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(CollectionSortMenu);
