// @flow
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
  position?: "left" | "right" | "center",
  collection: Collection,
  onOpen?: () => void,
  onClose?: () => void,
};

function CollectionSortMenu({
  collection,
  position,
  onOpen,
  onClose,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const menu = useMenuState({ modal: true });

  const handleChangeSort = React.useCallback(
    (field: string) => {
      return collection.save({
        sort: {
          field,
          direction: "asc",
        },
      });
    },
    [collection]
  );

  const alphabeticalSort = collection.sort.field === "title";

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <NudeButton {...props}>
            {alphabeticalSort ? <AlphabeticalSortIcon /> : <ManualSortIcon />}
          </NudeButton>
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Sort in sidebar")}>
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
