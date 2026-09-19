import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type Group from "~/models/Group";
import type User from "~/models/User";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useGroupUserMenuActions } from "~/hooks/useGroupUserMenuActions";

type Props = {
  /** The group the user is a member of. */
  group: Group;
  /** The member of the group. */
  user: User;
};

/**
 * Overflow menu with the actions available for a member of a group.
 */
export const GroupMemberMenu = observer(function GroupMemberMenu({
  group,
  user,
}: Props) {
  const { t } = useTranslation();
  const rootAction = useGroupUserMenuActions();

  return (
    <ActionContextProvider value={{ activeModels: [group, user] }}>
      <DropdownMenu
        action={rootAction}
        align="end"
        ariaLabel={t("Group member options")}
      >
        <OverflowMenuButton />
      </DropdownMenu>
    </ActionContextProvider>
  );
});
