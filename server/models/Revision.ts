import { Op, SaveOptions } from "sequelize";
import {
  DataType,
  BelongsTo,
  Column,
  DefaultScope,
  ForeignKey,
  Table,
  IsNumeric,
  Length as SimpleLength,
} from "sequelize-typescript";
import { DocumentValidation } from "@shared/validations";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@DefaultScope(() => ({
  include: [
    {
      model: User,
      as: "user",
      paranoid: false,
    },
  ],
}))
@Table({ tableName: "revisions", modelName: "revision" })
@Fix
class Revision extends IdModel {
  @IsNumeric
  @Column(DataType.SMALLINT)
  version: number;

  @SimpleLength({
    max: 255,
    msg: `editorVersion must be 255 characters or less`,
  })
  @Column
  editorVersion: string;

  @Length({
    max: DocumentValidation.maxTitleLength,
    msg: `Revision title must be ${DocumentValidation.maxTitleLength} characters or less`,
  })
  @Column
  title: string;

  @Column(DataType.TEXT)
  text: string;

  // associations

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

  static findLatest(documentId: string) {
    return this.findOne({
      where: {
        documentId,
      },
      order: [["createdAt", "DESC"]],
    });
  }

  static buildFromDocument(document: Document) {
    return this.build({
      title: document.title,
      text: document.text,
      userId: document.lastModifiedById,
      editorVersion: document.editorVersion,
      version: document.version,
      documentId: document.id,
      // revision time is set to the last time document was touched as this
      // handler can be debounced in the case of an update
      createdAt: document.updatedAt,
    });
  }

  static createFromDocument(
    document: Document,
    options?: SaveOptions<Revision>
  ) {
    const revision = this.buildFromDocument(document);
    return revision.save(options);
  }

  // instance methods

  previous(): Promise<Revision | null> {
    return (this.constructor as typeof Revision).findOne({
      where: {
        documentId: this.documentId,
        createdAt: {
          [Op.lt]: this.createdAt,
        },
      },
      order: [["createdAt", "DESC"]],
    });
  }
}

export default Revision;
