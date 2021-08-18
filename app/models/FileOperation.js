// @flow
import { computed } from "mobx";
import BaseModal from "./BaseModel";
import Collection from "./Collection";
import User from "./User";

class FileOperation extends BaseModal {
  id: string;
  state: string;
  collection: ?Collection;
  key: ?string;
  size: number;
  type: string;
  user: User;
  createdAt: string;

  @computed
  get sizeInMB(): string {
    return (this.size / (1024 * 1024)).toPrecision(2) + "MB";
  }
}

export default FileOperation;
