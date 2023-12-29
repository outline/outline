import uniqBy from "lodash/uniqBy";
import { computed } from "mobx";
import SearchQuery from "~/models/SearchQuery";
import RootStore from "./RootStore";
import Store, { RPCAction } from "./base/Store";

export default class SearchesStore extends Store<SearchQuery> {
  actions = [RPCAction.List, RPCAction.Delete];

  constructor(rootStore: RootStore) {
    super(rootStore, SearchQuery);
  }

  @computed
  get recent(): SearchQuery[] {
    return uniqBy(this.orderedData, "query")
      .filter((search) => search.source === "app")
      .slice(0, 8);
  }
}
