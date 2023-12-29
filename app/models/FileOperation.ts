import { computed, observable } from "mobx";
import { FileOperationFormat, FileOperationType } from "@shared/types";
import { bytesToHumanReadable } from "@shared/utils/files";
import User from "./User";
import Model from "./base/Model";

class FileOperation extends Model {
  static modelName = "FileOperation";

  id: string;

  @observable
  state: string;

  name: string;

  error: string | null;

  collectionId: string | null;

  @observable
  size: number;

  type: FileOperationType;

  format: FileOperationFormat;

  user: User;

  @computed
  get sizeInMB(): string {
    return bytesToHumanReadable(this.size);
  }

  @computed
  get downloadUrl(): string {
    return `/api/fileOperations.redirect?id=${this.id}`;
  }
}

export default FileOperation;
