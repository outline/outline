import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type Group from "~/models/Group";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useGroupMenuActions } from "~/hooks/useGroupMenuActions";

type Props = {
  group: Group;
  /** Whether to hide the "Members" navigation action. */
  hideMembers?: boolean;
};

function GroupMenu({ group, hideMembers }: Props) {
  const { t } = useTranslation();
  const rootAction = useGroupMenuActions({ hideMembers });

  return (
    <ActionContextProvider value={{ activeModels: [group] }}>
      <DropdownMenu
        action={rootAction}
        align="end"
        ariaLabel={t("Group options")}
      >
        <OverflowMenuButton />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

export default observer(GroupMenu);
