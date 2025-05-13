import { action, observable } from "mobx";
import { client } from "~/utils/ApiClient";
import User from "../User";
import ParanoidModel from "../base/ParanoidModel";
import Field from "../decorators/Field";
import Relation from "../decorators/Relation";
import OAuthClient from "./OAuthClient";

class OAuthAuthentication extends ParanoidModel {
  static modelName = "OAuthAuthentication";

  /** A list of scopes that this authentication has access to */
  @Field
  @observable
  scope: string[];

  @Relation(() => User)
  user: User;

  userId: string;

  oauthClient: Pick<OAuthClient, "id" | "name" | "clientId" | "avatarUrl">;

  oauthClientId: string;

  lastActiveAt: string;

  @action
  public async deleteAll() {
    await client.post(`/${this.store.apiEndpoint}.delete`, {
      oauthClientId: this.oauthClientId,
      scope: this.scope,
    });

    return this.store.remove(this.id);
  }
}

export default OAuthAuthentication;
