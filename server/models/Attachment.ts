import { createReadStream } from "fs";
import path from "path";
import { File } from "formidable";
import JWT from "jsonwebtoken";
import { QueryTypes } from "sequelize";
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
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import FileStorage from "@server/storage/files";
import { getJWTPayload } from "@server/utils/jwt";
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
    return FileStorage.getFileStream(this.key);
  }

  /**
   * Get the contents of this attachment as a buffer.
   */
  get buffer() {
    return FileStorage.getFileBuffer(this.key);
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
    return encodeURI(FileStorage.getUrlForKey(this.key));
  }

  /**
   * Get a signed URL with the default expirt to download the attachment from storage.
   */
  get signedUrl() {
    return FileStorage.getSignedUrl(this.key);
  }

  async saveFile(file: File) {
    return FileStorage.upload({
      body: createReadStream(file.filepath),
      contentLength: file.size,
      contentType: this.contentType,
      key: this.key,
      acl: this.acl,
    });
  }

  // hooks

  @BeforeDestroy
  static async deleteAttachmentFromS3(model: Attachment) {
    await FileStorage.deleteFile(model.key);
  }

  // static methods

  /**
   * Get the total size of all attachments for a given team.
   *
   * @param teamId - The ID of the team to get the total size for.
   * @returns A promise resolving to the total size of all attachments for the given team in bytes.
   */
  static async getTotalSizeForTeam(teamId: string): Promise<number> {
    const result = await this.sequelize!.query<{ total: string }>(
      `
      SELECT SUM(size) as total
      FROM attachments
      WHERE "teamId" = :teamId
    `,
      {
        replacements: { teamId },
        type: QueryTypes.SELECT,
      }
    );

    return parseInt(result?.[0]?.total ?? "0", 10);
  }

  /**
   * Get the attachment given a unique signature.
   *
   * @param sign - The signature that uniquely identifies an attachment
   * @returns A promise resolving to attachment corresponding to the signature
   * @throws {AuthenticationError} Invalid signature if the signature verification fails
   */
  static async findBySignature(sign: string): Promise<Attachment> {
    const payload = getJWTPayload(sign);

    if (payload.type !== "attachment") {
      throw AuthenticationError("Invalid signature");
    }

    try {
      JWT.verify(sign, env.SECRET_KEY);
    } catch (err) {
      throw AuthenticationError("Invalid signature");
    }

    const attachmentId = payload.key.split("/")[2];
    return this.findByPk(attachmentId, {
      rejectOnEmpty: true,
    });
  }

  /**
   * Get the attachment given a key
   *
   * @param key The key representing attachment file path
   * @returns A promise resolving to attachment corresponding to the key
   */

  static async findByKey(key: string): Promise<Attachment> {
    const id = key.split("/")[2];
    return this.findByPk(id, { rejectOnEmpty: true });
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
