import { Op } from "sequelize";
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
} from "sequelize-typescript";
import CollectionGroup from "./CollectionGroup";
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
      association: "groupMemberships",
      required: false,
    },
  ],
}))
@Table({
  tableName: "groups",
  modelName: "group",
  validate: {
    isUniqueNameInTeam: async function () {
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
class Group extends ParanoidModel {
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
