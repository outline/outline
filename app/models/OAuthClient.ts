import { observable } from "mobx";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

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

  /** The developer facing ID of this app */
  @Field
  clientId: string;

  /** The developer facing secret of this app */
  @Field
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
}

export default OAuthClient;
