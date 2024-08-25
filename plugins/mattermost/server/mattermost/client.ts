import { Response } from "node-fetch";
import { JSONObject } from "@shared/types";
import { InternalError, InvalidRequestError } from "@server/errors";
import fetch from "@server/utils/fetch";
import { Channel, ChannelType, Team, User, Webhook } from "../../shared/types";
import { MattermostApi } from "./api";

const Integration = {
  Name: "Outline",
  Description:
    "Outline is an open source team wiki and knowledgebase for growing teams.",
};

type MattermostRequestOpts<T> =
  | {
      url: string;
      apiKey: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseResponse: (json: any) => T;
    } & ({ method: "GET" } | { method: "POST"; data: JSONObject });

const invokeMattermost = async <T>(opts: MattermostRequestOpts<T>) => {
  let body: string | undefined;
  let res: Response;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.apiKey}`,
    Accept: "application/json",
  };

  if (opts.method === "POST") {
    headers["Content-type"] = "application/json";
    body = JSON.stringify(opts.data);
  }

  try {
    res = await fetch(opts.url, {
      method: opts.method,
      headers,
      body,
    });
  } catch (err) {
    throw InternalError();
  }

  if (res.ok) {
    return opts.parseResponse(await res.json());
  } else if (res.status >= 400 && res.status < 500) {
    throw InvalidRequestError();
  } else {
    throw InternalError();
  }
};

export const getUser = async ({
  serverUrl,
  apiKey,
}: {
  serverUrl: string;
  apiKey: string;
}): Promise<User> =>
  invokeMattermost<User>({
    method: "GET",
    url: `${serverUrl}${MattermostApi.User}`,
    apiKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseResponse: (data: any) => ({
      id: data.id,
      name: data.username,
      email: data.email,
    }),
  });

export const getUserTeams = async ({
  serverUrl,
  apiKey,
}: {
  serverUrl: string;
  apiKey: string;
}): Promise<Team[]> =>
  invokeMattermost<Team[]>({
    method: "GET",
    url: `${serverUrl}${MattermostApi.UserTeams}`,
    apiKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseResponse: (data: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.map((team: any) => ({ id: team.id, name: team.display_name })),
  });

export const getChannels = async ({
  serverUrl,
  apiKey,
  teamId,
}: {
  serverUrl: string;
  apiKey: string;
  teamId: string;
}): Promise<Channel[]> =>
  invokeMattermost<Channel[]>({
    method: "GET",
    url: `${serverUrl}${MattermostApi.TeamChannels(teamId)}`,
    apiKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseResponse: (data: any) =>
      data
        .filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (channel: any) =>
            channel.type === ChannelType.Public ||
            channel.type === ChannelType.Private
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((channel: any) => ({
          id: channel.id,
          name: channel.display_name,
          type:
            channel.type === ChannelType.Public
              ? ChannelType.Public
              : ChannelType.Private,
        })),
  });

export const createWebhook = async ({
  serverUrl,
  apiKey,
  channel,
}: {
  serverUrl: string;
  apiKey: string;
  channel: Pick<Channel, "id" | "name">;
}): Promise<Webhook> =>
  invokeMattermost<Webhook>({
    method: "POST",
    url: `${serverUrl}${MattermostApi.CreateWebhook}`,
    apiKey,
    data: {
      channel_id: channel.id,
      display_name: `${Integration.Name} (${channel.name})`,
      description: Integration.Description,
      channel_locked: true,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseResponse: (data: any) => ({
      id: data.id,
      url: `${serverUrl}${MattermostApi.PostWebhook(data.id)}`,
    }),
  });
