import OAuthClient from "~/models/OAuthClient";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class OAuthClientsStore extends Store<OAuthClient> {
  constructor(rootStore: RootStore) {
    super(rootStore, OAuthClient);
  }
}
