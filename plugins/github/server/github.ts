import env from "@server/env";
import { InvalidRequestError } from "@server/errors";
import fetch from "@server/utils/fetch";

const GITHUB_URL = "https://github.com";

export async function post(endpoint: string, body: Record<string, any>) {
  let data;

  try {
    const response = await fetch(`${GITHUB_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    data = await response.json();
  } catch (err) {
    throw InvalidRequestError(err.message);
  }

  if (!data.access_token) {
    throw InvalidRequestError(data.error);
  }
  return data;
}

export async function oauthAccess(
  code: string,
  redirect_uri = `${env.URL}/api/github.callback`
) {
  return post("/login/oauth/access_token", {
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
    redirect_uri,
    code,
  });
}
