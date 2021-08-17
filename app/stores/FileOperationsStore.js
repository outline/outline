// @flow
import invariant from "invariant";
import { orderBy } from "lodash";
import { computed } from "mobx";
import FileOperation from "models/FileOperation";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";
import { client } from "utils/ApiClient";

export default class FileOperationsStore extends BaseStore<FileOperation> {
  actions = ["list", "delete"];

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

  async viewExport(fileOperationId: string) {
    const res = await client.post("/fileOperations.redirect", {
      id: fileOperationId,
    });
    invariant(res && res.data, "Data should be available");
    window.open(res.data, "_blank");
  }
}
