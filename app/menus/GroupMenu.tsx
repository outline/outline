import { observer } from "mobx-react";
import { EditIcon, GroupIcon, TrashIcon } from "outline-icons";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Group from "~/models/Group";
import {
  DeleteGroupDialog,
  EditGroupDialog,
  ViewGroupMembersDialog,
} from "~/scenes/Settings/components/GroupDialogs";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import {
  ActionSeparator,
  createAction,
  createExternalLinkAction,
} from "~/actions";
import { GroupSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  group: Group;
};

function GroupMenu({ group }: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const can = usePolicy(group);

  const handleViewMembers = useCallback(() => {
    dialogs.openModal({
      title: t("Group members"),
      content: <ViewGroupMembersDialog group={group} />,
    });
  }, [t, group, dialogs]);

  const handleEditGroup = useCallback(() => {
    dialogs.openModal({
      title: t("Edit group"),
      content: (
        <EditGroupDialog group={group} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [t, group, dialogs]);

  const handleDeleteGroup = useCallback(() => {
    dialogs.openModal({
      title: t("Delete group"),
      content: (
        <DeleteGroupDialog group={group} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [t, group, dialogs]);

  const actions = useMemo(
    () => [
      createAction({
        name: `${t("Members")}…`,
        icon: <GroupIcon />,
        section: GroupSection,
        visible: !!(group && can.read),
        perform: handleViewMembers,
      }),
      ActionSeparator,
      createAction({
        name: `${t("Edit")}…`,
        icon: <EditIcon />,
        section: GroupSection,
        visible: !!(group && can.update),
        perform: handleEditGroup,
      }),
      createAction({
        name: `${t("Delete")}…`,
        icon: <TrashIcon />,
        section: GroupSection,
        visible: !!(group && can.delete),
        dangerous: true,
        perform: handleDeleteGroup,
      }),
      ActionSeparator,
      createExternalLinkAction({
        name: group.externalId ?? "",
        section: GroupSection,
        visible: !!group.externalId,
        disabled: true,
        url: "",
      }),
    ],
    [
      t,
      group,
      can.read,
      can.update,
      can.delete,
      handleViewMembers,
      handleEditGroup,
      handleDeleteGroup,
    ]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Group options")}
    >
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(GroupMenu);
