// @flow
import { computed } from "mobx";
import BaseModel from "./BaseModel";

class User extends BaseModel {
  avatarUrl: string;
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  lastActiveAt: string;
  isSuspended: boolean;
  createdAt: string;
  language: string;

  @computed
  get isInvited(): boolean {
    return !this.lastActiveAt;
  }
}

export default User;
