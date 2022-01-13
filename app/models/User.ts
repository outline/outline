import { computed, observable } from "mobx";
import { Role } from "@shared/types";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class User extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  avatarUrl: string;

  @Field
  @observable
  name: string;

  @Field
  @observable
  color: string;

  @Field
  @observable
  language: string;

  email: string;

  isAdmin: boolean;

  isViewer: boolean;

  lastActiveAt: string;

  isSuspended: boolean;

  createdAt: string;

  @computed
  get isInvited(): boolean {
    return !this.lastActiveAt;
  }

  @computed
  get role(): Role {
    if (this.isAdmin) {
      return "admin";
    } else if (this.isViewer) {
      return "viewer";
    } else {
      return "member";
    }
  }
}

export default User;
