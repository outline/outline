import { observable } from "mobx";
import User from "~/models/User";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Comment extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  data: Record<string, any>;

  @Field
  parentCommentId: string;

  documentId: string;

  createdAt: string;

  createdBy: User;

  resolvedAt: string;

  resolvedBy: User;

  updatedAt: string;
}

export default Comment;
