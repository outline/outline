import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import Document from "./Document";
import Tag from "./Tag";
import User from "./User";
import IdModel from "./base/IdModel";

@Table({
  tableName: "document_tags",
  modelName: "document_tag",
  updatedAt: false,
})
class DocumentTag extends IdModel<
  InferAttributes<DocumentTag>,
  Partial<InferCreationAttributes<DocumentTag>>
> {
  static eventNamespace = "tags";

  // associations

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Tag, "tagId")
  tag: Tag;

  @ForeignKey(() => Tag)
  @Column(DataType.UUID)
  tagId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string | null;
}

export default DocumentTag;
