import orderBy from "lodash/orderBy";
import { computed } from "mobx";
import { FileOperationType } from "@shared/types";
import FileOperation from "~/models/FileOperation";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class FileOperationsStore extends BaseStore<FileOperation> {
  actions = [RPCAction.List, RPCAction.Info, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, FileOperation);
  }

  @computed
  get imports(): FileOperation[] {
    return orderBy(
      Array.from(this.data.values()).reduce(
        (acc, fileOp) =>
          fileOp.type === FileOperationType.Import ? [...acc, fileOp] : acc,
        []
      ),
      "createdAt",
      "desc"
    );
  }

  @computed
  get exports(): FileOperation[] {
    return orderBy(
      Array.from(this.data.values()).reduce(
        (acc, fileOp) =>
          fileOp.type === FileOperationType.Export ? [...acc, fileOp] : acc,
        []
      ),
      "createdAt",
      "desc"
    );
  }
}
