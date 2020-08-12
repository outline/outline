// @flow
import querystring from "querystring";
import fetch from "isomorphic-fetch";
import { InvalidRequestError } from "./errors";

const GITHUB_MAIN_URL = "https://github.com";
const GITHUB_API_URL = "https://api.github.com";

export async function get(
  endpoint: string,
  token: string,
  body: Object,
  mainHost: string = GITHUB_API_URL
) {
  let data;

  try {
    const response = await fetch(
      `${mainHost}/${endpoint}?${querystring.stringify(body)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    data = await response.json();
  } catch (err) {
    throw new InvalidRequestError(err.message);
  }
  return data;
}

export async function request(
  endpoint: string,
  body: Object,
  mainHost: string = GITHUB_API_URL
) {
  let data;
  try {
    const response = await fetch(
      `${mainHost}/${endpoint}?${querystring.stringify(body)}`
    );
    // Valid response
    // access_token=$TOKEN&scope=read%3Aorg%2Crepo%2Cuser&token_type=bearer
    //
    // See the following info as to why GitHub not returning JSON
    // https://github.com/ciaranj/node-oauth/blob/master/lib/oauth2.js#L200
    data = await response.text();
    data = querystring.parse(data);
  } catch (err) {
    throw new InvalidRequestError(err.message);
  }
  if (!data.access_token) throw new InvalidRequestError(data.error);

  return data;
}

export async function oauthAccess(
  code: string,
  redirect_uri: string = `${process.env.URL || ""}/auth/github.callback`
) {
  return request(
    "login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri,
      code,
    },
    GITHUB_MAIN_URL
  );
}

export async function userProfile(token: string) {
  return get("user", token);
}

export async function userEmails(token: string) {
  return get("user/emails", token);
}

export async function teams(token: string) {
  return get("user/orgs", token);
}
