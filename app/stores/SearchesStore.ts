import uniqBy from "lodash/uniqBy";
import { computed } from "mobx";
import SearchQuery from "~/models/SearchQuery";
import BaseStore, { RPCAction } from "./BaseStore";
import RootStore from "./RootStore";

export default class SearchesStore extends BaseStore<SearchQuery> {
  actions = [RPCAction.List, RPCAction.Delete];

  apiEndpoint = "searches";

  constructor(rootStore: RootStore) {
    super(rootStore, SearchQuery);
  }

  @computed
  get recent(): SearchQuery[] {
    return uniqBy(this.orderedData, "query").slice(0, 8);
  }
}
