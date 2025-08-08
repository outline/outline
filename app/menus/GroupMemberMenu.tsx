import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useMenuAction } from "~/hooks/useMenuAction";
import { useMemo } from "react";
import { createActionV2 } from "~/actions";
import { GroupSection } from "~/actions/sections";

type Props = {
  onRemove: () => void;
};

function GroupMemberMenu({ onRemove }: Props) {
  const { t } = useTranslation();

  const actions = useMemo(
    () => [
      createActionV2({
        name: t("Remove"),
        section: GroupSection,
        dangerous: true,
        perform: onRemove,
      }),
    ],
    [t, onRemove]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Group member options")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(GroupMemberMenu);
