import path from "path";
import {
  BeforeDestroy,
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  IsIn,
  Table,
  DataType,
  IsNumeric,
} from "sequelize-typescript";
import { publicS3Endpoint, deleteFromS3, getFileByKey } from "@server/utils/s3";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
import Length from "./validators/Length";

@Table({ tableName: "attachments", modelName: "attachment" })
@Fix
class Attachment extends IdModel {
  @Length({
    max: 4096,
    msg: "key must be 4096 characters or less",
  })
  @Column
  key: string;

  @Length({
    max: 4096,
    msg: "url must be 4096 characters or less",
  })
  @Column
  url: string;

  @Length({
    max: 255,
    msg: "contentType must be 255 characters or less",
  })
  @Column
  contentType: string;

  @IsNumeric
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
}

export default Attachment;
