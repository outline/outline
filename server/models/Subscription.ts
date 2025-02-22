import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  IsIn,
  Scopes,
} from "sequelize-typescript";
import { SubscriptionType } from "@shared/types";
import Collection from "./Collection";
import Document from "./Document";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";

@Scopes(() => ({
  withUser: {
    include: [
      {
        association: "user",
      },
    ],
  },
}))
@Table({ tableName: "subscriptions", modelName: "subscription" })
@Fix
class Subscription extends ParanoidModel<
  InferAttributes<Subscription>,
  Partial<InferCreationAttributes<Subscription>>
> {
  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  collectionId: string | null;

  @IsIn([Object.values(SubscriptionType)])
  @Column(DataType.STRING)
  event: string;
}

export default Subscription;
