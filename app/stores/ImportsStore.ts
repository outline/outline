import invariant from "invariant";
import { action, runInAction } from "mobx";
import Import from "~/models/Import";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class ImportsStore extends Store<Import> {
  constructor(rootStore: RootStore) {
    super(rootStore, Import);
  }

  @action
  cancel = async (importModel: Import) => {
    const res = await client.post("/imports.cancel", {
      id: importModel.id,
    });

    runInAction("Import#cancel", () => {
      invariant(res?.data, "Data should be available");
      importModel.updateData(res.data);
      this.addPolicies(res.policies);
    });
  };
}
