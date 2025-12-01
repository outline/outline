import { computed } from "mobx";
import Emoji from "~/models/Emoji";
import naturalSort from "@shared/utils/naturalSort";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class EmojisStore extends Store<Emoji> {
  actions = [
    RPCAction.Info,
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Delete,
  ];

  constructor(rootStore: RootStore) {
    super(rootStore, Emoji);
  }

  @computed
  get orderedData(): Emoji[] {
    return naturalSort(Array.from(this.data.values()), "name");
  }
}
