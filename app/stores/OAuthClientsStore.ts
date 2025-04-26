import OAuthClient from "~/models/oauth/OAuthClient";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class OAuthClientsStore extends Store<OAuthClient> {
  apiEndpoint = "oauthClients";

  constructor(rootStore: RootStore) {
    super(rootStore, OAuthClient);
  }
}
