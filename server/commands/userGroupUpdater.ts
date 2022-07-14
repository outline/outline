import Group from "@server/models/Group";
import GroupUser from "@server/models/GroupUser";
import User from "@server/models/User";

export default async function userGroupsUpdater(
  user: User,
  groupNames: string[]
) {
  const groups = [];
  for (const groupName of groupNames) {
    const group = await Group.findOne({
      where: {
        name: groupName,
      },
    });
    if (group) {
      groups.push(group);
    } else {
      const group = await Group.create({
        name: groupName,
        // TODO: Who should be the group's creator?
        teamId: user.teamId,
        createdById: user.id,
      });
      groups.push(group);
    }
  }
  const groupIds = groups.map((group) => group.id);

  const oldGroupUsers = await GroupUser.findAll({
    where: {
      userId: user.id,
    },
  });

  const oldGroupIds = oldGroupUsers.map((groupUser) => groupUser.groupId);

  for (const groupUser of oldGroupUsers) {
    if (groupIds.indexOf(groupUser.groupId) === -1) {
      await groupUser.destroy();
    }
  }
  for (const groupId of groupIds) {
    if (oldGroupIds.indexOf(groupId) === -1) {
      await GroupUser.create({
        groupId,
        userId: user.id,
        createdById: user.id,
      });
    }
  }
}
