// @flow
import { computed } from "mobx";
import type { Role } from "shared/types";
import BaseModel from "./BaseModel";

class User extends BaseModel {
  avatarUrl: string;
  id: string;
  name: string;
  email: string;
  color: string;
  isAdmin: boolean;
  isViewer: boolean;
  lastActiveAt: string;
  isSuspended: boolean;
  createdAt: string;
  language: string;

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
