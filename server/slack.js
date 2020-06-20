// @flow
import fetch from "isomorphic-fetch";
import querystring from "querystring";
import { InvalidRequestError } from "./errors";

const SLACK_API_URL = "https://slack.com/api";

export async function post(endpoint: string, body: Object) {
  let data;

  const token = body.token;
  try {
    const response = await fetch(`${SLACK_API_URL}/${endpoint}`, {
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
      `${SLACK_API_URL}/${endpoint}?${querystring.stringify(body)}`
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
  redirect_uri: string = `${process.env.URL || ""}/auth/slack.callback`
) {
  return request("oauth.access", {
    client_id: process.env.SLACK_KEY,
    client_secret: process.env.SLACK_SECRET,
    redirect_uri,
    code,
  });
}
