import invariant from "invariant";
import OAuthClient from "@server/utils/oauth";
import env from "./env";

export default class GoogleClient extends OAuthClient {
  endpoints = {
    authorize: "https://accounts.google.com/o/oauth2/auth",
    token: "https://accounts.google.com/o/oauth2/token",
    userinfo: "https://www.googleapis.com/oauth2/v3/userinfo",
  };

  constructor() {
    invariant(env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID is required");
    invariant(env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET is required");

    super(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  }
}
