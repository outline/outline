// @flow
import { computed } from "mobx";
import type { Rank } from "shared/types";
import BaseModel from "./BaseModel";

class User extends BaseModel {
  avatarUrl: string;
  id: string;
  name: string;
  email: string;
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
  get rank(): Rank {
    if (this.isAdmin) {
      return "Admin";
    } else if (this.isViewer) {
      return "Viewer";
    } else {
      return "Member";
    }
  }
}

export default User;
