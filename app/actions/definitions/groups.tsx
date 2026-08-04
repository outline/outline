import { EditIcon, GroupIcon, TrashIcon } from "outline-icons";
import Group from "~/models/Group";
import {
  DeleteGroupDialog,
  EditGroupDialog,
} from "~/scenes/Settings/components/GroupDialogs";
import { createExternalLinkAction, createInternalLinkAction } from "~/actions";
import {
  dialogActionFactory,
  everyActiveModel,
} from "~/actions/definitions/common";
import { GroupSection } from "~/actions/sections";
import { settingsPath } from "~/utils/routeHelpers";

export const groupMembers = createInternalLinkAction({
  name: ({ t }) => t("Members"),
  analyticsName: "Group members",
  section: GroupSection,
  icon: <GroupIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Group).some((policy) => policy.abilities.read),
  to: ({ getActiveModel }) => {
    const group = getActiveModel(Group);
    return group ? settingsPath("groups", group.id, "members") : "";
  },
});

export const editGroup = dialogActionFactory({
  analyticsName: "Edit group",
  section: GroupSection,
  name: (t) => `${t("Edit")}…`,
  title: (t) => t("Edit group"),
  content: (onSubmit, { getActiveModel }) => {
    const group = getActiveModel(Group);
    return group ? <EditGroupDialog group={group} onSubmit={onSubmit} /> : null;
  },
  icon: <EditIcon />,
  visible: ({ getActiveModels, getActivePolicies }) =>
    getActiveModels(Group).length === 1 &&
    getActivePolicies(Group).some((policy) => policy.abilities.update),
});

export const deleteGroup = dialogActionFactory({
  analyticsName: "Delete group",
  section: GroupSection,
  name: (t) => `${t("Delete")}…`,
  title: (t, { getActiveModels }) =>
    getActiveModels(Group).length === 1
      ? t("Delete group")
      : t("Delete {{ count }} group", {
          count: getActiveModels(Group).length,
        }),
  content: (onSubmit, { getActiveModels }) => (
    <DeleteGroupDialog groups={getActiveModels(Group)} onSubmit={onSubmit} />
  ),
  icon: <TrashIcon />,
  dangerous: true,
  visible: (context) =>
    everyActiveModel(
      context,
      Group,
      (group) => context.stores.policies.abilities(group.id).delete
    ),
});

/** Read-only row surfacing the group's identifier. */
export const groupExternalId = createExternalLinkAction({
  name: ({ getActiveModel }) => getActiveModel(Group)?.externalId ?? "",
  section: GroupSection,
  visible: ({ getActiveModel }) => !!getActiveModel(Group)?.externalId,
  disabled: true,
  url: "",
});

/** Read-only row surfacing the identifier of the group in its provider. */
export const groupProviderExternalId = createExternalLinkAction({
  name: ({ getActiveModel }) =>
    `External ID: ${getActiveModel(Group)?.externalGroup?.externalId ?? ""}`,
  section: GroupSection,
  visible: ({ getActiveModel }) =>
    !!getActiveModel(Group)?.externalGroup?.externalId,
  disabled: true,
  url: "",
});
