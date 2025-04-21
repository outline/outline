import { observable } from "mobx";
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

  @Relation(() => OAuthClient)
  oauthClient: OAuthClient;

  oauthClientId: string;

  lastActiveAt: string;
}

export default OAuthAuthentication;
