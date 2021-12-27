import { Op } from "sequelize";
import {
  AfterDestroy,
  BeforeValidate,
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  HasMany,
  BelongsToMany,
  DefaultScope,
} from "sequelize-typescript";
import CollectionGroup from "./CollectionGroup";
import GroupUser from "./GroupUser";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";

@DefaultScope(() => ({
  include: [
    {
      association: "groupMemberships",
      required: false,
    },
  ],
  order: [["name", "ASC"]],
}))
@Table({ tableName: "groups", modelName: "group" })
class Group extends ParanoidModel {
  @Column
  name: string;

  // hooks

  @BeforeValidate
  static async validateName(model: Group) {
    const foundItem = await Group.findOne({
      where: {
        teamId: model.teamId,
        name: {
          [Op.iLike]: model.name,
        },
        id: {
          [Op.not]: model.id,
        },
      },
    });

    if (foundItem) {
      throw new Error("The name of this group is already in use");
    }
  }

  @AfterDestroy
  static async deleteGroupUsers(model: Group) {
    if (!model.deletedAt) return;
    await GroupUser.destroy({
      where: {
        groupId: model.id,
      },
    });
    await CollectionGroup.destroy({
      where: {
        groupId: model.id,
      },
    });
  }

  // associations

  @HasMany(() => GroupUser, "groupId")
  groupMemberships: GroupUser[];

  @HasMany(() => CollectionGroup, "groupId")
  collectionGroupMemberships: CollectionGroup[];

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column
  createdById: string;

  @BelongsToMany(() => User, () => GroupUser)
  users: User[];
}

export default Group;
