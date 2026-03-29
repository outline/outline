import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import AuthenticationProvider from "./AuthenticationProvider";
import Group from "./Group";
import Team from "./Team";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({
  tableName: "external_groups",
  modelName: "external_group",
})
@Fix
class ExternalGroup extends IdModel<
  InferAttributes<ExternalGroup>,
  Partial<InferCreationAttributes<ExternalGroup>>
> {
  /** The external identifier from the provider (e.g. OIDC group id or name). */
  @Length({
    max: 255,
    msg: "externalId must be 255 characters or less",
  })
  @Column
  externalId: string;

  /** The group name as reported by the external provider. */
  @Length({
    max: 255,
    msg: "name must be 255 characters or less",
  })
  @Column
  name: string;

  /** When this record was last synced from the provider. */
  @Column(DataType.DATE)
  lastSyncedAt: Date | null;

  // associations

  /** The linked internal Outline Group, if one has been created. */
  @BelongsTo(() => Group, "groupId")
  group: Group | null;

  @ForeignKey(() => Group)
  @Column(DataType.UUID)
  groupId: string | null;

  /** The authentication provider this external group came from. */
  @BelongsTo(() => AuthenticationProvider, "authenticationProviderId")
  authenticationProvider: AuthenticationProvider;

  @ForeignKey(() => AuthenticationProvider)
  @Column(DataType.UUID)
  authenticationProviderId: string;

  /** The team this external group belongs to. */
  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default ExternalGroup;
