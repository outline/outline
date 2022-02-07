import { computed } from "mobx";
import BaseModal from "./BaseModel";
import User from "./User";

class FileOperation extends BaseModal {
  id: string;

  state: string;

  name: string;

  error: string | null;

  collectionId: string | null;

  size: number;

  type: "import" | "export";

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
