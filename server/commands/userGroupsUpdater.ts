import Group from "@server/models/Group";
import GroupUser from "@server/models/GroupUser";
import User from "@server/models/User";

export default async function userGroupsUpdater(
  user: User,
  groupNames: string[]
) {
  groupNames = Array.from(new Set(groupNames));
  const groups = [];
  for (const groupName of groupNames) {
    let group = await Group.findOne({
      where: {
        name: groupName,
      },
    });
    if (!group) {
      group = await Group.create({
        name: groupName,
        teamId: user.teamId,
        createdById: user.id,
      });
    }
    groups.push(group);
  }
  const nextGroupIds = groups.map((group) => group.id);
  const oldGroupUsers = await GroupUser.findAll({
    where: {
      userId: user.id,
    },
  });
  const oldGroupIds = oldGroupUsers.map((groupUser) => groupUser.groupId);
  for (const groupUser of oldGroupUsers) {
    if (!nextGroupIds.includes(groupUser.groupId)) {
      await groupUser.destroy();
    }
  }
  for (const groupId of nextGroupIds) {
    if (!oldGroupIds.includes(groupId)) {
      await GroupUser.create({
        groupId,
        userId: user.id,
        createdById: user.id,
      });
    }
  }
}
