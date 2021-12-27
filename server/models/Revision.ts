import { DataTypes, FindOptions } from "sequelize";
import {
  BelongsTo,
  Column,
  DefaultScope,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import MarkdownSerializer from "slate-md-serializer";
import Document from "./Document";
import User from "./User";
import BaseModel from "./base/BaseModel";

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
class Revision extends BaseModel {
  @Column(DataTypes.SMALLINT)
  version: number;

  @Column
  editorVersion: string;

  @Column
  title: string;

  @Column(DataTypes.TEXT)
  text: string;

  // associations

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column
  documentId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  static findLatest = function (documentId: string) {
    return Revision.findOne({
      where: {
        documentId,
      },
      order: [["createdAt", "DESC"]],
    });
  };

  static createFromDocument = function (
    document: Document,
    options: FindOptions<Revision>
  ) {
    return Revision.create(
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
  };

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
