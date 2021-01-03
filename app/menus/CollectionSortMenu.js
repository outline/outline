// @flow
import { observer } from "mobx-react";
import { AlphabeticSortIcon, ManualSortIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Collection from "models/Collection";
import { DropdownMenu } from "components/DropdownMenu";
import DropdownMenuItems from "components/DropdownMenu/DropdownMenuItems";

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
    <DropdownMenu
      onOpen={onOpen}
      onClose={onClose}
      label={alphabeticalSort ? <AlphabeticSortIcon /> : <ManualSortIcon />}
      position={position}
      {...rest}
    >
      <DropdownMenuItems
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
    </DropdownMenu>
  );
}

export default observer(CollectionSortMenu);
