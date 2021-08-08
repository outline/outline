// @flow
import { computed } from "mobx";
import Export from "models/Export";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class ExportsStore extends BaseStore<Export> {
  actions = ["list", "delete"];

  constructor(rootStore: RootStore) {
    super(rootStore, Export);
  }

  @computed
  get allData(): Export[] {
    return Array.from(this.data.values());
  }
}
