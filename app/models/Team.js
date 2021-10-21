// @flow
import { computed } from "mobx";
import BaseModel from "./BaseModel";

class Team extends BaseModel {
  id: string;
  name: string;
  avatarUrl: string;
  sharing: boolean;
  collaborativeEditing: boolean;
  documentEmbeds: boolean;
  guestSignin: boolean;
  subdomain: ?string;
  domain: ?string;
  url: string;
  defaultUserRole: string;

  @computed
  get signinMethods(): string {
    return "SSO";
  }
}

export default Team;
