import Import from "~/models/Import";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class ImportsStore extends Store<Import> {
  constructor(rootStore: RootStore) {
    super(rootStore, Import);
  }
}
