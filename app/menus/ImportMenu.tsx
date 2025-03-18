import { observer } from "mobx-react";
import { CrossIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import Import from "~/models/Import";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import usePolicy from "~/hooks/usePolicy";
import { MenuItem } from "~/types";

type Props = {
  /** Import to which actions will be applied. */
  importModel: Import;
  /** Callback to handle import cancellation. */
  onCancel: () => Promise<void>;
  /** Callback to handle import deletion. */
  onDelete: () => Promise<void>;
};

export const ImportMenu = observer(
  ({ importModel, onCancel, onDelete }: Props) => {
    const { t } = useTranslation();
    const can = usePolicy(importModel);
    const menu = useMenuState({
      modal: true,
    });

    const items = React.useMemo(() => {
      const menuItems: MenuItem[] = [];

      if (can.cancel) {
        menuItems.push({
          type: "button",
          title: t("Cancel"),
          visible: true,
          icon: <CrossIcon />,
          dangerous: true,
          onClick: onCancel,
        });
      }

      if (can.delete) {
        menuItems.push({
          type: "button",
          title: t("Delete"),
          visible: true,
          icon: <TrashIcon />,
          dangerous: true,
          onClick: onDelete,
        });
      }

      return menuItems;
    }, [t, can, onCancel, onDelete]);

    return (
      <>
        <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
        <ContextMenu {...menu} aria-label={t("Import menu options")}>
          <Template {...menu} items={items} />
        </ContextMenu>
      </>
    );
  }
);
