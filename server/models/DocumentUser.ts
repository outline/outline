import {
  Column,
  ForeignKey,
  BelongsTo,
  Default,
  IsIn,
  Table,
  DataType,
  Scopes,
  PrimaryKey,
} from "sequelize-typescript";
import { DocumentPermission } from "@shared/types";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Fix from "./decorators/Fix";

@Scopes(() => ({
  withUser: {
    include: [
      {
        association: "user",
      },
    ],
  },
  withDocument: {
    include: [
      {
        association: "document",
      },
    ],
  },
}))
@Table({ tableName: "document_users", modelName: "document_user" })
@Fix
class DocumentUser extends Model {
  @Default(DocumentPermission.ReadWrite)
  @IsIn([Object.values(DocumentPermission)])
  @Column(DataType.STRING)
  permission: DocumentPermission;

  // associations

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @PrimaryKey
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @PrimaryKey
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;
}

export default DocumentUser;
