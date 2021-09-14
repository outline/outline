// @flow
import Sequelize from "sequelize";
import { Event, Group, GroupUser, User } from "../models";
import { sequelize } from "../sequelize";

const Op = Sequelize.Op;

type GroupCreatorResult = {|
  group: Group,
  membership: GroupUser,
  isNewGroup: boolean,
|};

export default async function groupCreator({
  name,
  ip,
  user,
}: {|
  name: string,
  ip: string,
  user: User,
|}): Promise<GroupCreatorResult> {
  let isNewGroup = false;
  let group = await Group.findOne({
    where: {
      name: { [Op.iLike]: name },
    },
  });

  // The group does not already exist so we should create it
  if (!group) {
    let transaction = await sequelize.transaction();

    try {
      group = await Group.create(
        {
          name,
          teamId: user.teamId,
          createdById: user.id,
        },
        {
          transaction,
        }
      );

      await Event.create(
        {
          name: "groups.create",
          actorId: user.id,
          teamId: user.teamId,
          modelId: group.id,
          data: { name },
          ip,
        },
        {
          transaction,
        }
      );

      await transaction.commit();

      // reload to get default scope
      group = await Group.findByPk(group.id);
      isNewGroup = true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  // Check for an existing group membership
  let membership = await GroupUser.findOne({
    where: {
      groupId: group.id,
      userId: user.id,
    },
  });

  // User is not a member of the group, so we should add them
  if (!membership) {
    await group.addUser(user, {
      through: { createdById: user.id },
    });

    membership = await GroupUser.findOne({
      where: {
        groupId: group.id,
        userId: user.id,
      },
    });

    await Event.create({
      name: "groups.add_user",
      userId: user.id,
      teamId: user.teamId,
      modelId: group.id,
      actorId: user.id,
      data: { name: user.name },
      ip,
    });

    // reload to get default scope
    group = await Group.findByPk(group.id);
  }

  return {
    isNewGroup,
    group,
    membership,
  };
}
