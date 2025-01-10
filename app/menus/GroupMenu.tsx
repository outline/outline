import { observer } from "mobx-react";
import { EditIcon, GroupIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import Group from "~/models/Group";
import {
  DeleteGroupDialog,
  EditGroupDialog,
  ViewGroupMembersDialog,
} from "~/scenes/Settings/components/GroupDialogs";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Template from "~/components/ContextMenu/Template";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  group: Group;
};

function GroupMenu({ group }: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const menu = useMenuState({
    modal: true,
  });
  const can = usePolicy(group);

  const handleViewMembers = React.useCallback(() => {
    dialogs.openModal({
      title: t("Group members"),
      content: <ViewGroupMembersDialog group={group} />,
      fullscreen: true,
    });
  }, [t, group, dialogs]);

  const handleEditGroup = React.useCallback(() => {
    dialogs.openModal({
      title: t("Edit group"),
      content: (
        <EditGroupDialog group={group} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [t, group, dialogs]);

  const handleDeleteGroup = React.useCallback(() => {
    dialogs.openModal({
      title: t("Delete group"),
      content: (
        <DeleteGroupDialog group={group} onSubmit={dialogs.closeAllModals} />
      ),
    });
  }, [t, group, dialogs]);

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Group options")}>
        <Template
          {...menu}
          items={[
            {
              type: "button",
              title: `${t("Members")}…`,
              icon: <GroupIcon />,
              onClick: handleViewMembers,
              visible: !!(group && can.read),
            },
            {
              type: "separator",
            },
            {
              type: "button",
              title: `${t("Edit")}…`,
              icon: <EditIcon />,
              onClick: handleEditGroup,
              visible: !!(group && can.update),
            },
            {
              type: "button",
              title: `${t("Delete")}…`,
              icon: <TrashIcon />,
              dangerous: true,
              onClick: handleDeleteGroup,
              visible: !!(group && can.delete),
            },
            {
              type: "separator",
            },
            {
              type: "link",
              href: "",
              title: group.externalId,
              disabled: true,
              visible: !!group.externalId,
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(GroupMenu);
