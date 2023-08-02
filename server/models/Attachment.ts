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
import {
  publicS3Endpoint,
  deleteFromS3,
  getFileStream,
  getSignedUrl,
  getFileBuffer,
} from "@server/utils/s3";
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

  @Column
  lastAccessedAt: Date | null;

  @Column
  expiresAt: Date | null;

  // getters

  /**
   * Get the original uploaded file name.
   */
  get name() {
    return path.parse(this.key).base;
  }

  /**
   * Whether the attachment is private or not.
   */
  get isPrivate() {
    return this.acl === "private";
  }

  /**
   * Get the contents of this attachment as a readable stream.
   */
  get stream() {
    return getFileStream(this.key);
  }

  /**
   * Get the contents of this attachment as a buffer.
   */
  get buffer() {
    return getFileBuffer(this.key);
  }

  /**
   * Get a url that can be used to download the attachment if the user has a valid session.
   */
  get url() {
    return this.isPrivate ? this.redirectUrl : this.canonicalUrl;
  }

  /**
   * Get a url that can be used to download a private attachment if the user has a valid session.
   */
  get redirectUrl() {
    return `/api/attachments.redirect?id=${this.id}`;
  }

  /**
   * Get a direct URL to the attachment in storage. Note that this will not work for private attachments,
   * a signed URL must be used.
   */
  get canonicalUrl() {
    return encodeURI(`${publicS3Endpoint()}/${this.key}`);
  }

  /**
   * Get a signed URL with the default expirt to download the attachment from storage.
   */
  get signedUrl() {
    return getSignedUrl(this.key);
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
