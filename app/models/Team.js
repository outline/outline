// @flow
import { computed } from "mobx";
import BaseModel from "./BaseModel";

class Team extends BaseModel {
  id: string;
  name: string;
  avatarUrl: string;
  slackConnected: boolean;
  googleConnected: boolean;
  sharing: boolean;
  documentEmbeds: boolean;
  guestSignin: boolean;
  subdomain: ?string;
  domain: ?string;
  url: string;

  @computed
  get signinMethods(): string {
    if (this.slackConnected && this.googleConnected) {
      return "Slack or Google";
    }
    if (this.slackConnected) return "Slack";
    return "Google";
  }
}

export default Team;
