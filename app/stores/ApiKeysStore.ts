import ApiKey from "models/ApiKey";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class ApiKeysStore extends BaseStore<ApiKey> {
  // @ts-expect-error ts-migrate(2416) FIXME: Property 'actions' in type 'ApiKeysStore' is not a... Remove this comment to see the full error message
  actions = ["list", "create", "delete"];

  constructor(rootStore: RootStore) {
    super(rootStore, ApiKey);
  }
}
