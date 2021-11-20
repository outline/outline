import { orderBy } from "lodash";
import { computed } from "mobx";
import FileOperation from "../models/FileOperation";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class FileOperationsStore extends BaseStore<FileOperation> {
  actions = [RPCAction.List, RPCAction.Info, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, FileOperation);
  }

  @computed
  get exports(): FileOperation[] {
    return Array.from(this.data.values()).reduce(
      (acc, fileOp) => (fileOp.type === "export" ? [...acc, fileOp] : acc),
      []
    );
  }

  @computed
  get orderedDataExports(): FileOperation[] {
    return orderBy(this.exports, "createdAt", "desc");
  }
}
