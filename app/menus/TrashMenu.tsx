import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { permanentlyDeleteDocumentsInTrash } from "~/actions/definitions/documents";
import { useMenuAction } from "~/hooks/useMenuAction";

function TrashMenu() {
  const { t } = useTranslation();

  const actions = useMemo(() => [permanentlyDeleteDocumentsInTrash], []);
  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Trash options")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(TrashMenu);
