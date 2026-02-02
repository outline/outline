import type {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import {
  Table,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

/**
 * DocumentReminder model for storing reminders set by document owners
 * to notify editors about document updates.
 */
@Table({ tableName: "document_reminders", modelName: "DocumentReminder" })
@Fix
class DocumentReminder extends IdModel<
  InferAttributes<DocumentReminder>,
  InferCreationAttributes<DocumentReminder>
> {
  /** The document for which the reminder is set */
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Document)
  document: Document;

  /** The owner of the document who set the reminder */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  ownerId: string;

  @BelongsTo(() => User, "ownerId")
  owner: User;

  /** The editor (user) who should receive the reminder */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  editorId: string;

  @BelongsTo(() => User, "editorId")
  editor: User;

  /** The reminder message/note */
  @Column(DataType.TEXT)
  message: string | null;

  /** Whether the reminder is active */
  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive: boolean;

  /** The date when the reminder was last sent */
  @Column(DataType.DATE)
  lastSentAt: Date | null;

  /** The date when the reminder should be sent next (if recurring) */
  @Column(DataType.DATE)
  nextSendAt: Date | null;

  /** Interval for recurring reminders (in days, null for one-time) */
  @Column(DataType.INTEGER)
  intervalDays: number | null;

  @CreatedAt
  createdAt: CreationOptional<Date>;

  @UpdatedAt
  updatedAt: CreationOptional<Date>;
}

export default DocumentReminder;
