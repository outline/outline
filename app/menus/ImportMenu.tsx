import { TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import Import from "~/models/Import";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  /** Import to which actions will be applied. */
  importModel: Import;
  /** Callback to handle import deletion. */
  onDelete: (ev: React.SyntheticEvent) => Promise<void>;
};

function ImportMenu({ importModel, onDelete }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(importModel);
  const menu = useMenuState({
    modal: true,
  });

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Import menu options")}>
        <Template
          {...menu}
          items={[
            {
              type: "button",
              title: t("Delete"),
              visible: can.delete,
              icon: <TrashIcon />,
              dangerous: true,
              onClick: onDelete,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default ImportMenu;
