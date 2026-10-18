import invariant from "invariant";
import OAuthClient from "@server/utils/oauth";
import env from "./env";

export default class DiscordClient extends OAuthClient {
  endpoints = {
    authorize: "https://discord.com/oauth2/authorize",
    token: "https://discord.com/api/oauth2/token",
    userinfo: "https://discord.com/api/users/@me",
  };

  constructor() {
    invariant(env.DISCORD_CLIENT_ID, "DISCORD_CLIENT_ID is required");
    invariant(env.DISCORD_CLIENT_SECRET, "DISCORD_CLIENT_SECRET is required");

    super(env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET);
  }
}
