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

  @Length({
    max: 1,
    msg: `Emoji must be a single character`,
  })
  @Column
  emoji: string | null;

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

  // static methods

  /**
   * Find the latest revision for a given document
   *
   * @param documentId The document id to find the latest revision for
   * @returns A Promise that resolves to a Revision model
   */
  static findLatest(documentId: string) {
    return this.findOne({
      where: {
        documentId,
      },
      order: [["createdAt", "DESC"]],
    });
  }

  /**
   * Build a Revision model from a Document model
   *
   * @param document The document to build from
   * @returns A Revision model
   */
  static buildFromDocument(document: Document) {
    return this.build({
      title: document.title,
      text: document.text,
      emoji: document.emoji,
      userId: document.lastModifiedById,
      editorVersion: document.editorVersion,
      version: document.version,
      documentId: document.id,
      // revision time is set to the last time document was touched as this
      // handler can be debounced in the case of an update
      createdAt: document.updatedAt,
    });
  }

  /**
   * Create a Revision model from a Document model and save it to the database
   *
   * @param document The document to create from
   * @param options Options passed to the save method
   * @returns A Promise that resolves when saved
   */
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
