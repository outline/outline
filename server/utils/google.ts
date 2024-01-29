import OAuthClient from "./oauth";

export default class GoogleClient extends OAuthClient {
  endpoints = {
    authorize: "https://accounts.google.com/o/oauth2/auth",
    token: "https://accounts.google.com/o/oauth2/token",
    userinfo: "https://www.googleapis.com/oauth2/v3/userinfo",
  };
}
