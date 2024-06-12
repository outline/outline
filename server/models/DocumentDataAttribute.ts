import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  BelongsTo,
  ForeignKey,
  Column,
  Table,
  DataType,
} from "sequelize-typescript";
import DataAttribute from "./DataAttribute";
import Document from "./Document";
import User from "./User";
import Model from "./base/Model";
import Fix from "./decorators/Fix";

@Table({
  tableName: "document_data_attributes",
  modelName: "document_data_attribute",
})
@Fix
class DocumentDataAttribute extends Model<
  InferAttributes<DocumentDataAttribute>,
  Partial<InferCreationAttributes<DocumentDataAttribute>>
> {
  @Column
  value: string;

  // associations

  @BelongsTo(() => DataAttribute, "dataAttributeId")
  dataAttribute: DataAttribute;

  @ForeignKey(() => DataAttribute)
  @Column(DataType.UUID)
  dataAttributeId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;
}

export default DocumentDataAttribute;
