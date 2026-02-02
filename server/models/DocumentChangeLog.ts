import type {
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import {
  BelongsTo,
  Column,
  ForeignKey,
  Table,
  DataType,
  Length,
} from "sequelize-typescript";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

/**
 * DocumentChangeLog model for tracking all changes and deletions made to documents
 * by users other than the document owner.
 */
@Table({ tableName: "document_change_logs", modelName: "documentChangeLog" })
@Fix
class DocumentChangeLog extends IdModel<
  InferAttributes<DocumentChangeLog>,
  Partial<InferCreationAttributes<DocumentChangeLog>>
> {
  /** The document that was changed */
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Document)
  document: Document;

  /** The owner of the document (createdById) */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  ownerId: string;

  @BelongsTo(() => User, "ownerId")
  owner: User;

  /** The user who made the change */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  changedById: string;

  @BelongsTo(() => User, "changedById")
  changedBy: User;

  /** Type of change: 'update', 'delete', 'archive', 'restore', 'unpublish' */
  @Length({
    max: 50,
    msg: "changeType must be 50 characters or less",
  })
  @Column(DataType.STRING)
  changeType: string;

  /** Description of what was changed */
  @Length({
    max: 1000,
    msg: "description must be 1000 characters or less",
  })
  @Column(DataType.TEXT)
  description: string | null;

  /** Additional metadata about the change (JSON) */
  @Column(DataType.JSONB)
  metadata: Record<string, unknown> | null;
}

export default DocumentChangeLog;
