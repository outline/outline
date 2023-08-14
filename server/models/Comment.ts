import {
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
  Scopes,
  Length,
  DefaultScope,
} from "sequelize-typescript";
import type { ProsemirrorData } from "@shared/types";
import { CommentValidation } from "@shared/validations";
import Document from "./Document";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import TextLength from "./validators/TextLength";

@DefaultScope(() => ({
  include: [
    {
      model: User,
      as: "createdBy",
      paranoid: false,
    },
  ],
}))
@Scopes(() => ({
  withDocument: {
    include: [
      {
        model: Document,
        as: "document",
        required: true,
      },
    ],
  },
}))
@Table({ tableName: "comments", modelName: "comment" })
@Fix
class Comment extends ParanoidModel {
  @TextLength({
    max: CommentValidation.maxLength,
    msg: `Comment must be less than ${CommentValidation.maxLength} characters`,
  })
  @Length({
    max: CommentValidation.maxLength * 10,
    msg: `Comment data is too large`,
  })
  @Column(DataType.JSONB)
  data: ProsemirrorData;

  // associations

  @BelongsTo(() => User, "createdById")
  createdBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string;

  @BelongsTo(() => User, "resolvedById")
  resolvedBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  resolvedById: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Comment, "parentCommentId")
  parentComment: Comment;

  @ForeignKey(() => Comment)
  @Column(DataType.UUID)
  parentCommentId: string;
}

export default Comment;
