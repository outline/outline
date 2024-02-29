import querystring from "querystring";
import { InvalidRequestError } from "@server/errors";
import fetch from "@server/utils/fetch";
import { SlackUtils } from "../shared/SlackUtils";
import env from "./env";

const SLACK_API_URL = "https://slack.com/api";

export async function post(endpoint: string, body: Record<string, any>) {
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
    throw InvalidRequestError(err.message);
  }

  if (!data.ok) {
    throw InvalidRequestError(data.error);
  }
  return data;
}

export async function request(endpoint: string, body: Record<string, any>) {
  let data;

  try {
    const response = await fetch(
      `${SLACK_API_URL}/${endpoint}?${querystring.stringify(body)}`
    );
    data = await response.json();
  } catch (err) {
    throw InvalidRequestError(err.message);
  }

  if (!data.ok) {
    throw InvalidRequestError(data.error);
  }
  return data;
}

export async function oauthAccess(
  code: string,
  redirect_uri = SlackUtils.callbackUrl()
) {
  return request("oauth.access", {
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    redirect_uri,
    code,
  });
}
