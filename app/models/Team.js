// @flow
import { computed } from "mobx";
import BaseModel from "./BaseModel";

class Team extends BaseModel {
  id: string;
  name: string;
  avatarUrl: string;
  sharing: boolean;
  documentEmbeds: boolean;
  guestSignin: boolean;
  subdomain: ?string;
  domain: ?string;
  url: string;

  @computed
  get signinMethods(): string {
    return "SSO";
  }
}

export default Team;
