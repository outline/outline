// @flow
import BaseModel from './BaseModel';

class Team extends BaseModel {
  id: string;
  name: string;
  avatarUrl: string;
  slackConnected: boolean;
  googleConnected: boolean;
  sharing: boolean;
  subdomain: ?string;
  url: string;
}

export default Team;
