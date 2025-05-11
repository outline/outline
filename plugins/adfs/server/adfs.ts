import invariant from "invariant";
import OAuthClient from "@server/utils/oauth";
import env from "./env";

export default class ADFSClient extends OAuthClient {
  endpoints = {
    authorize: env.ADFS_AUTH_URI || "",
    token: env.ADFS_TOKEN_URI || "",
    userinfo: env.ADFS_USERINFO_URI || "",
  };

  constructor() {
    invariant(env.ADFS_CLIENT_ID, "ADFS_CLIENT_ID is required");
    invariant(env.ADFS_CLIENT_SECRET, "ADFS_CLIENT_SECRET is required");

    super(env.ADFS_CLIENT_ID, env.ADFS_CLIENT_SECRET);
  }
}
