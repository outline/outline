import orderBy from "lodash/orderBy";
import { computed } from "mobx";
import DataAttribute from "~/models/DataAttribute";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class DataAttributesStore extends Store<DataAttribute> {
  actions = [
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Update,
    RPCAction.Delete,
  ];

  constructor(rootStore: RootStore) {
    super(rootStore, DataAttribute);
  }

  @computed
  get active(): DataAttribute[] {
    return this.orderedData.filter((d) => !d.deletedAt);
  }

  @computed
  get deleted(): DataAttribute[] {
    return orderBy(this.orderedData, "deletedAt", "desc").filter(
      (d) => d.deletedAt
    );
  }
}
