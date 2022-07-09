import { FindOptions } from "sequelize";
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
import MarkdownSerializer from "slate-md-serializer";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

const serializer = new MarkdownSerializer();

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
    max: MAX_TITLE_LENGTH,
    msg: `Revision title must be ${MAX_TITLE_LENGTH} characters or less`,
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

  static createFromDocument(
    document: Document,
    options?: FindOptions<Revision>
  ) {
    return this.create(
      {
        title: document.title,
        text: document.text,
        userId: document.lastModifiedById,
        editorVersion: document.editorVersion,
        version: document.version,
        documentId: document.id,
        // revision time is set to the last time document was touched as this
        // handler can be debounced in the case of an update
        createdAt: document.updatedAt,
      },
      options
    );
  }

  migrateVersion = function () {
    let migrated = false;

    // migrate from document version 0 -> 1
    if (!this.version) {
      // removing the title from the document text attribute
      this.text = this.text.replace(/^#\s(.*)\n/, "");
      this.version = 1;
      migrated = true;
    }

    // migrate from document version 1 -> 2
    if (this.version === 1) {
      const nodes = serializer.deserialize(this.text);
      this.text = serializer.serialize(nodes, {
        version: 2,
      });
      this.version = 2;
      migrated = true;
    }

    if (migrated) {
      return this.save({
        silent: true,
        hooks: false,
      });
    }
  };
}

export default Revision;
