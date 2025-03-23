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

    const items = React.useMemo(
      () =>
        [
          {
            type: "button",
            title: t("Cancel"),
            visible: can.cancel,
            icon: <CrossIcon />,
            dangerous: true,
            onClick: onCancel,
          },
          {
            type: "button",
            title: t("Delete"),
            visible: can.delete,
            icon: <TrashIcon />,
            dangerous: true,
            onClick: onDelete,
          },
        ] satisfies MenuItem[],
      [t, can.delete, can.cancel, onCancel, onDelete]
    );

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
