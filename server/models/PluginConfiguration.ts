import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  Table,
  BelongsTo,
  ForeignKey,
  DataType,
  NotEmpty,
} from "sequelize-typescript";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

export interface PluginConfigData {
  [key: string]: string | undefined;
}

@Table({
  tableName: "plugin_configurations",
  modelName: "plugin_configuration",
})
@Fix
class PluginConfiguration extends ParanoidModel<
  InferAttributes<PluginConfiguration>,
  Partial<InferCreationAttributes<PluginConfiguration>>
> {
  static eventNamespace = "pluginConfigurations";

  @NotEmpty
  @Length({ max: 255, msg: "Plugin ID must be 255 characters or less" })
  @Column
  pluginId: string;

  @Column(DataType.JSONB)
  config: PluginConfigData;

  // associations

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

  // static methods

  /**
   * Find plugin configuration by plugin ID and team ID
   */
  public static async findByPluginAndTeam(
    pluginId: string,
    teamId: string
  ): Promise<PluginConfiguration | null> {
    return this.findOne({
      where: {
        pluginId,
        teamId,
      },
    });
  }
}

export default PluginConfiguration;
