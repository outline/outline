import { computed, observable } from "mobx";
import BaseModel from "./BaseModel";
import Field from "./decorators/Field";

class Team extends BaseModel {
  @Field
  @observable
  id: string;

  @Field
  @observable
  name: string;

  @Field
  @observable
  avatarUrl: string;

  @Field
  @observable
  sharing: boolean;

  @Field
  @observable
  inviteRequired: boolean;

  @Field
  @observable
  collaborativeEditing: boolean;

  @Field
  @observable
  documentEmbeds: boolean;

  @Field
  @observable
  defaultCollectionId: string | null;

  @Field
  @observable
  memberCollectionCreate: boolean;

  @Field
  @observable
  guestSignin: boolean;

  @Field
  @observable
  subdomain: string | null | undefined;

  @Field
  @observable
  defaultUserRole: string;

  domain: string | null | undefined;

  url: string;

  @Field
  @observable
  allowedDomains: string[] | null | undefined;

  @computed
  get signinMethods(): string {
    return "SSO";
  }
}

export default Team;
