// @flow
import { computed } from "mobx";
import BaseModal from "./BaseModel";
import Collection from "./Collection";
import User from "./User";

class FileOperation extends BaseModal {
  id: string;
  state: string;
  collection: ?Collection;
  size: number;
  type: string;
  user: User;
  createdAt: string;

  @computed
  get sizeInMB(): string {
    const inKB = this.size / 1024;
    if (inKB < 1024) {
      return inKB.toFixed(2) + "KB";
    }

    return (inKB / 1024).toFixed(2) + "MB";
  }
}

export default FileOperation;
