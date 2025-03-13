import { FileOperationType } from "@shared/types";
import orderBy from "lodash/orderBy";
import { computedFn } from "mobx-utils";
import FileOperation from "~/models/FileOperation";
import Import from "~/models/Import";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class ImportsStore extends Store<Import> {
  actions = [RPCAction.List, RPCAction.Info, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, Import);
  }

  all = computedFn((importsLimit: number, fileOpsLimit: number) => {
    const imports = this.orderedData.slice(0, importsLimit);
    const fileOps = this.rootStore.fileOperations
      .filter({ type: FileOperationType.Import })
      .slice(0, fileOpsLimit);

    return orderBy([...imports, ...fileOps], "createdAt", "desc");
  });
}
