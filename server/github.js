// @flow
import querystring from "querystring";
import fetch from "isomorphic-fetch";
import { InvalidRequestError } from "./errors";

const GITHUB_API_URL = "https://api.github.com";

export async function post(endpoint: string, body: Object) {
    let data;
  
    const token = body.token;
    try {
      const response = await fetch(`${GITHUB_API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      data = await response.json();
    } catch (err) {
      throw new InvalidRequestError(err.message);
    }
    if (!data.ok) throw new InvalidRequestError(data.error);
  
    return data;
  }

export async function request(endpoint: string, body: Object) {
  let data;
  try {
    const response = await fetch(
      `${GITHUB_API_URL}/${endpoint}?${querystring.stringify(body)}`
    );
    data = await response.json();
  } catch (err) {
    throw new InvalidRequestError(err.message);
  }
  if (!data.ok) throw new InvalidRequestError(data.error);

  return data;
}

export async function oauthAccess(
    code: string,
    redirect_uri: string = `${process.env.URL || ""}/auth/github.callback`
  ) {
    return request("login/oauth/access_token", {
      client_id: process.env.GITHUB_KEY,
      client_secret: process.env.GITHUB_SECRET,
      redirect_uri,
      code,
    });
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