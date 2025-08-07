import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { useMemo } from "react";
import { ActionV2Separator, createActionV2 } from "~/actions";
import { CollectionSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";

type Props = {
  onMembers: () => void;
  onRemove: () => void;
};

function CollectionGroupMemberMenu({ onMembers, onRemove }: Props) {
  const { t } = useTranslation();

  const actions = useMemo(
    () => [
      createActionV2({
        name: t("Members"),
        section: CollectionSection,
        perform: onMembers,
      }),
      ActionV2Separator,
      createActionV2({
        name: t("Remove"),
        section: CollectionSection,
        dangerous: true,
        perform: onRemove,
      }),
    ],
    [t, onMembers, onRemove]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Group member options")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(CollectionGroupMemberMenu);
