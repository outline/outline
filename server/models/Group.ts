import { InferAttributes, InferCreationAttributes, Op } from "sequelize";
import {
  AfterDestroy,
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  HasMany,
  BelongsToMany,
  DefaultScope,
  DataType,
  Scopes,
} from "sequelize-typescript";
import GroupMembership from "./GroupMembership";
import GroupUser from "./GroupUser";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

@DefaultScope(() => ({
  include: [
    {
      association: "groupUsers",
      required: false,
    },
  ],
}))
@Scopes(() => ({
  withMember: (memberId: string) => ({
    include: [
      {
        association: "groupUsers",
        required: true,
      },
      {
        association: "members",
        required: true,
        where: {
          userId: memberId,
        },
      },
    ],
  }),
}))
@Table({
  tableName: "groups",
  modelName: "group",
  validate: {
    async isUniqueNameInTeam() {
      const foundItem = await Group.findOne({
        where: {
          teamId: this.teamId,
          name: {
            [Op.iLike]: this.name,
          },
          id: {
            [Op.not]: this.id,
          },
        },
      });

      if (foundItem) {
        throw new Error("The name of this group is already in use");
      }
    },
  },
})
@Fix
class Group extends ParanoidModel<
  InferAttributes<Group>,
  Partial<InferCreationAttributes<Group>>
> {
  @Length({ min: 0, max: 255, msg: "name must be be 255 characters or less" })
  @NotContainsUrl
  @Column
  name: string;

  // hooks

  @AfterDestroy
  static async deleteGroupUsers(model: Group) {
    if (!model.deletedAt) {
      return;
    }
    await GroupUser.destroy({
      where: {
        groupId: model.id,
      },
    });
    await GroupMembership.destroy({
      where: {
        groupId: model.id,
      },
    });
  }

  static filterByMember(memberId: string | undefined) {
    return memberId
      ? this.scope({ method: ["withMember", memberId] })
      : this.scope("defaultScope");
  }

  // associations

  @HasMany(() => GroupUser, "groupId")
  @HasMany(() => GroupUser, { as: "members", foreignKey: "groupId" })
  groupUsers: GroupUser[];

  @HasMany(() => GroupMembership, "groupId")
  groupMemberships: GroupMembership[];

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsToMany(() => User, () => GroupUser)
  users: User[];
}

export default Group;
