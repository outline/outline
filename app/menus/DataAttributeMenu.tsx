import copy from "copy-to-clipboard";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import { toast } from "sonner";
import DataAttribute from "~/models/DataAttribute";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Separator from "~/components/ContextMenu/Separator";
import { DataAttributeEdit } from "~/components/DataAttribute/DataAttributeEdit";
import useStores from "~/hooks/useStores";

type Props = {
  /** The DataAttribute to associate with the menu */
  dataAttribute: DataAttribute;
};

function DataAttributeMenu({ dataAttribute }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const handleEdit = React.useCallback(() => {
    dialogs.openModal({
      title: t("Edit attribute"),
      content: (
        <DataAttributeEdit
          dataAttribute={dataAttribute}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  }, [t, dialogs, dataAttribute]);

  const handleCopy = React.useCallback(() => {
    copy(dataAttribute.id);
    toast.success("Copied to clipboard");
  }, [dataAttribute]);

  const handleDelete = React.useCallback(() => {
    void dataAttribute.delete();
  }, [dataAttribute]);

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu}>
        <MenuItem {...menu} onClick={handleEdit}>
          {t("Edit")}…
        </MenuItem>
        <MenuItem {...menu} onClick={handleCopy}>
          {t("Copy ID")}
        </MenuItem>
        <Separator />
        <MenuItem {...menu} onClick={handleDelete} dangerous>
          {t("Delete")}…
        </MenuItem>
      </ContextMenu>
    </>
  );
}

export default observer(DataAttributeMenu);
