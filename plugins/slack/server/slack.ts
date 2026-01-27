import querystring from "node:querystring";
import { InvalidRequestError } from "@server/errors";
import fetch from "@server/utils/fetch";
import { SlackUtils } from "../shared/SlackUtils";
import env from "./env";

const SLACK_API_URL = "https://slack.com/api";

/**
 * Makes a POST request to the Slack API with JSON body.
 *
 * @param endpoint - the Slack API endpoint to call.
 * @param body - the request body containing token and other parameters.
 * @returns the parsed JSON response from Slack.
 */
export async function post(endpoint: string, body: Record<string, any>) {
  let data;
  const { token, ...bodyWithoutToken } = body;

  try {
    const response = await fetch(`${SLACK_API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyWithoutToken),
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

/**
 * Makes a POST request to the Slack API with form-urlencoded body.
 *
 * @param endpoint - the Slack API endpoint to call.
 * @param body - the request parameters.
 * @returns the parsed JSON response from Slack.
 */
export async function request(endpoint: string, body: Record<string, any>) {
  let data;
  const { client_id, client_secret, ...params } = body;

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Use HTTP Basic authentication for client credentials as recommended by
  // Slack documentation and OAuth 2.0 RFC 6749 Section 2.3.1.
  // This prevents client_secret from being exposed in URLs and logs.
  if (client_id && client_secret) {
    const credentials = Buffer.from(`${client_id}:${client_secret}`).toString(
      "base64"
    );
    headers["Authorization"] = `Basic ${credentials}`;
  }

  try {
    const response = await fetch(`${SLACK_API_URL}/${endpoint}`, {
      method: "POST",
      headers,
      body: querystring.stringify(params),
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

/**
 * Exchanges an OAuth authorization code for an access token.
 *
 * @param code - the authorization code received from Slack.
 * @param redirect_uri - the redirect URI used in the OAuth flow.
 * @returns the OAuth access response containing the access token.
 */
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
