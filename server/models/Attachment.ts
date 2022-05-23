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
  DataType,
} from "sequelize-typescript";
import { publicS3Endpoint, deleteFromS3, getFileByKey } from "@server/utils/s3";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "attachments", modelName: "attachment" })
@Fix
class Attachment extends BaseModel {
  @Column
  key: string;

  @Column
  url: string;

  @Column
  contentType: string;

  @Column(DataType.BIGINT)
  size: number;

  @Default("public-read")
  @IsIn([["private", "public-read"]])
  @Column
  acl: string;

  // getters

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

  /**
   * Use this instead of url which will be deleted soon, the column is unneccessary
   * and was not updated with the migraiton to the new s3 bucket.
   */
  get canonicalUrl() {
    return `${publicS3Endpoint()}/${this.key}`;
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
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  static async findAllInBatches(
    query: FindOptions<Attachment>,
    callback: (
      attachments: Array<Attachment>,
      query: FindOptions<Attachment>
    ) => Promise<void>
  ) {
    if (!query.offset) {
      query.offset = 0;
    }
    if (!query.limit) {
      query.limit = 10;
    }
    let results;

    do {
      results = await this.findAll(query);
      await callback(results, query);
      query.offset += query.limit;
    } while (results.length >= query.limit);
  }
}

export default Attachment;
