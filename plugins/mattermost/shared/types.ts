export type User = {
  id: string;
  name: string;
  email: string;
};

export type Team = {
  id: string;
  name: string;
};

export type UserTeams = {
  user: User;
  teams: Team[];
};

export enum ChannelType {
  Public = "O",
  Private = "P",
}

export type Channel = {
  id: string;
  name: string;
  type: ChannelType;
};

export type Webhook = {
  id: string;
  url: string;
};
