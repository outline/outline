import { action, observable } from "mobx";
import { client } from "~/utils/ApiClient";
import User from "../User";
import Field from "../decorators/Field";
import Relation from "../decorators/Relation";
import type OAuthClient from "./OAuthClient";
import Model from "../base/Model";

class OAuthAuthentication extends Model {
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
