import { ManualSortIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit";
import Button from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import { CommentSortType, MenuItem } from "~/types";

type Props = {
  value: CommentSortType;
  onSelect: (type: CommentSortType) => void;
};

const CommentSortMenu: React.FC<Props> = ({ value, onSelect }) => {
  const { t } = useTranslation();
  const menu = useMenuState({ modal: true });

  const items: MenuItem[] = React.useMemo(
    () => [
      {
        type: "button",
        title: t("Chronological sort"),
        visible: true,
        selected: value === CommentSortType.Chrono,
        onClick: () => {
          if (value !== CommentSortType.Chrono) {
            onSelect(CommentSortType.Chrono);
          }
        },
      },
      {
        type: "button",
        title: t("Positional sort"),
        visible: true,
        selected: value === CommentSortType.Position,
        onClick: () => {
          if (value !== CommentSortType.Position) {
            onSelect(CommentSortType.Position);
          }
        },
      },
    ],
    [t, value, onSelect]
  );

  return (
    <>
      <MenuButton {...menu} aria-label={t("Sort comments")}>
        {(props) => (
          <Button {...props} neutral borderOnHover icon={<ManualSortIcon />} />
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Sort comments")}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
};

export default CommentSortMenu;
