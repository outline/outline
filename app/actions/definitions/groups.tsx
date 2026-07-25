import { EditIcon, GroupIcon, TrashIcon } from "outline-icons";
import stores from "~/stores";
import type Group from "~/models/Group";
import {
  DeleteGroupDialog,
  EditGroupDialog,
} from "~/scenes/Settings/components/GroupDialogs";
import { createInternalLinkAction } from "~/actions";
import { dialogActionFactory } from "~/actions/definitions/common";
import { GroupSection } from "~/actions/sections";
import { settingsPath } from "~/utils/routeHelpers";

export const groupMembersActionFactory = (group: Group) =>
  createInternalLinkAction({
    name: ({ t }) => t("Members"),
    analyticsName: "Group members",
    section: GroupSection,
    icon: <GroupIcon />,
    visible: () => stores.policies.abilities(group.id).read,
    to: settingsPath("groups", group.id, "members"),
  });

export const editGroupActionFactory = (group: Group) =>
  dialogActionFactory({
    analyticsName: "Edit group",
    section: GroupSection,
    name: (t) => `${t("Edit")}…`,
    title: (t) => t("Edit group"),
    content: (onSubmit) => (
      <EditGroupDialog group={group} onSubmit={onSubmit} />
    ),
    icon: <EditIcon />,
    visible: () => stores.policies.abilities(group.id).update,
  });

export const deleteGroupActionFactory = (group: Group) =>
  dialogActionFactory({
    analyticsName: "Delete group",
    section: GroupSection,
    name: (t) => `${t("Delete")}…`,
    title: (t) => t("Delete group"),
    content: (onSubmit) => (
      <DeleteGroupDialog group={group} onSubmit={onSubmit} />
    ),
    icon: <TrashIcon />,
    dangerous: true,
    visible: () => stores.policies.abilities(group.id).delete,
  });
