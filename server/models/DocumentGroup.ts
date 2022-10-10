import { Op } from "sequelize";
import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  PrimaryKey,
  IsIn,
  Table,
  DataType,
  Scopes,
} from "sequelize-typescript";
import { DocumentPermission } from "@shared/types";
import Document from "./Document";
import Group from "./Group";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Fix from "./decorators/Fix";

@Scopes(() => ({
  withGroup: {
    include: [
      {
        association: "group",
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
  withOtherDocumentsInCollection: (
    groupId: string,
    document: Pick<Document, "id" | "collectionId">
  ) => ({
    include: [
      {
        model: Group,
        where: { id: groupId },
        required: true,
      },
      {
        model: Document,
        where: {
          collectionId: document.collectionId,
          id: {
            [Op.ne]: document.id,
          },
        },
        required: true,
      },
    ],
  }),
}))
@Table({ tableName: "document_groups", modelName: "document_group" })
@Fix
class DocumentGroup extends BaseModel {
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

  @BelongsTo(() => Group, "groupId")
  group: Group;

  @PrimaryKey
  @ForeignKey(() => Group)
  @Column(DataType.UUID)
  groupId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User;
}

export default DocumentGroup;
