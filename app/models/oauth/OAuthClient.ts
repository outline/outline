import invariant from "invariant";
import { observable, runInAction } from "mobx";
import queryString from "query-string";
import env from "~/env";
import { client } from "~/utils/ApiClient";
import User from "../User";
import ParanoidModel from "../base/ParanoidModel";
import Field from "../decorators/Field";
import Relation from "../decorators/Relation";

class OAuthClient extends ParanoidModel {
  static modelName = "OAuthClient";

  /** The human-readable name of this app */
  @Field
  @observable
  name: string;

  /** A short description of this app */
  @Field
  @observable
  description: string | null;

  /** The name of the developer of this app */
  @Field
  @observable
  developerName: string | null;

  /** The URL of the developer of this app */
  @Field
  @observable
  developerUrl: string | null;

  /** The URL of the avatar of the developer of this app */
  @Field
  @observable
  avatarUrl: string | null;

  /** The public identifier of this app */
  @Field
  clientId: string;

  /** The secret key used to authenticate this app */
  @Field
  @observable
  clientSecret: string;

  /** Whether this app is published (available to other workspaces) */
  @Field
  @observable
  published: boolean;

  /** A list of valid redirect URIs for this app */
  @Field
  @observable
  redirectUris: string[];

  @Relation(() => User)
  createdBy: User;

  createdById: string;

  // instance methods

  public async rotateClientSecret() {
    const res = await client.post("/oauthClients.rotate_secret", {
      id: this.id,
    });
    invariant(res.data, "Failed to rotate client secret");

    runInAction("OAuthClient#rotateSecret", () => {
      this.clientSecret = res.data.clientSecret;
    });
  }

  public get initial() {
    return this.name[0];
  }

  public get authorizationUrl(): string {
    const params = {
      client_id: this.clientId,
      redirect_uri: this.redirectUris[0],
      response_type: "code",
      scope: "read",
    };

    return `${env.URL}/oauth/authorize?${queryString.stringify(params)}`;
  }
}

export default OAuthClient;
