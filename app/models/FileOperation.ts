import { computed } from "mobx";
import { bytesToHumanReadable } from "@shared/utils/files";
import BaseModal from "./BaseModel";
import Collection from "./Collection";
import User from "./User";

class FileOperation extends BaseModal {
  id: string;

  state: string;

  collection: Collection | null | undefined;

  size: number;

  type: string;

  user: User;

  createdAt: string;

  @computed
  get sizeInMB(): string {
    return bytesToHumanReadable(this.size);
  }
}

export default FileOperation;
