import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  ForeignKey,
  BelongsTo,
  IsIn,
  Table,
  DataType,
  Scopes,
  Default,
  AllowNull,
} from "sequelize-typescript";
import Collection from "./Collection";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";

export enum MergeRequestStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Completed = "completed",
}

@Scopes(() => ({
  withCollections: {
    include: [
      {
        model: Collection,
        as: "targetCollection",
      },
    ],
  },
  withRequester: {
    include: [
      {
        model: User,
        as: "requestedBy",
      },
    ],
  },
}))
@Table({ tableName: "collection_merge_requests", modelName: "collection_merge_request" })
@Fix
class CollectionMergeRequest extends ParanoidModel<
  InferAttributes<CollectionMergeRequest>,
  Partial<InferCreationAttributes<CollectionMergeRequest>>
> {
  /** ID of the target collection (if merging into existing) */
  @AllowNull
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  targetCollectionId: string | null;

  /** Name for the new merged collection */
  @Column(DataType.STRING)
  newCollectionName: string;

  /** IDs of source collections to merge */
  @Column(DataType.ARRAY(DataType.UUID))
  sourceCollectionIds: string[];

  /** Status of the merge request */
  @Default(MergeRequestStatus.Pending)
  @IsIn([Object.values(MergeRequestStatus)])
  @Column(DataType.ENUM(...Object.values(MergeRequestStatus)))
  status: MergeRequestStatus;

  /** User who requested the merge */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  requestedById: string;

  /** Team this request belongs to */
  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  /** Approvals from collection owners: { collectionId: { userId, approvedAt } } */
  @Default({})
  @Column(DataType.JSONB)
  approvals: Record<string, { userId: string; approvedAt: string }>;

  /** Rejections from collection owners: { collectionId: { userId, rejectedAt, reason? } } */
  @Default({})
  @Column(DataType.JSONB)
  rejections: Record<string, { userId: string; rejectedAt: string; reason?: string }>;

  // Associations

  @BelongsTo(() => Collection, "targetCollectionId")
  targetCollection?: Collection | null;

  @BelongsTo(() => User, "requestedById")
  requestedBy?: User;

  @BelongsTo(() => Team, "teamId")
  team?: Team;
}

export default CollectionMergeRequest;
