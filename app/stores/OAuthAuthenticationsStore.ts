import OAuthAuthentication from "~/models/oauth/OAuthAuthentication";
import RootStore from "./RootStore";
import Store from "./base/Store";

export default class OAuthAuthenticationsStore extends Store<OAuthAuthentication> {
  apiEndpoint = "oauthAuthentications";

  constructor(rootStore: RootStore) {
    super(rootStore, OAuthAuthentication);
  }
}
