import { InferAttributes, InferCreationAttributes, Op } from "sequelize";
import {
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  HasMany,
  BelongsToMany,
  DataType,
  Scopes,
} from "sequelize-typescript";
import GroupMembership from "./GroupMembership";
import GroupUser from "./GroupUser";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import { CounterCache } from "./decorators/CounterCache";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";
import NotContainsUrl from "./validators/NotContainsUrl";

@Scopes(() => ({
  withMembership: (userId: string) => ({
    include: [
      {
        association: "groupUsers",
        required: true,
        where: {
          userId,
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

  @Column
  externalId: string;

  static filterByMember(userId: string | undefined) {
    return userId
      ? this.scope({ method: ["withMembership", userId] })
      : this.scope("defaultScope");
  }

  // associations

  @HasMany(() => GroupUser, "groupId")
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

  @CounterCache(() => GroupUser, { as: "members", foreignKey: "groupId" })
  memberCount: Promise<number>;
}

export default Group;
