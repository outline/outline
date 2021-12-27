import path from "path";
import { FindOptions } from "sequelize";
import {
  BeforeDestroy,
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  IsIn,
  Table,
} from "sequelize-typescript";
import { deleteFromS3, getFileByKey } from "@server/utils/s3";
import { DataTypes } from "../sequelize";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";

@Table({ tableName: "attachments", modelName: "attachment" })
class Attachment extends BaseModel {
  @Column
  key: string;

  @Column
  url: string;

  @Column
  contentType: string;

  @Column(DataTypes.BIGINT)
  size: number;

  @Column
  @Default("public-read")
  @IsIn([["private", "public-read"]])
  acl: string;

  get name() {
    return path.parse(this.key).base;
  }

  get redirectUrl() {
    return `/api/attachments.redirect?id=${this.id}`;
  }

  get isPrivate() {
    return this.acl === "private";
  }

  get buffer() {
    return getFileByKey(this.key);
  }

  // hooks

  @BeforeDestroy
  static async deleteAttachmentFromS3(model: Attachment) {
    await deleteFromS3(model.key);
  }

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;

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

  static findAllInBatches = async (
    query: FindOptions<Attachment>,
    callback: (
      attachments: Array<Attachment>,
      query: FindOptions<Attachment>
    ) => Promise<void>
  ) => {
    if (!query.offset) query.offset = 0;
    if (!query.limit) query.limit = 10;
    let results;

    do {
      results = await Attachment.findAll(query);
      await callback(results, query);
      query.offset += query.limit;
    } while (results.length >= query.limit);
  };
}

export default Attachment;
