import { z } from "zod";

export const HooksUnfurlSchema = z.object({
  body: z
    .object({
      challenge: z.string(),
    })
    .or(
      z.object({
        token: z.string(),
        team_id: z.string(),
        event: z.object({
          channel: z.string(),
          message_ts: z.string(),
          links: z.array(
            z.object({
              url: z.string(),
            })
          ),
          user: z.string(),
        }),
      })
    ),
});

export const HooksSlackCommandSchema = z.object({
  body: z.object({
    token: z.string(),
    team_id: z.string(),
    user_id: z.string(),
    response_url: z.string().optional(),
    text: z.string().prefault(""),
  }),
});

export const HooksInteractiveSchema = z.object({
  body: z.object({
    payload: z.string(),
  }),
});

/** The JSON payload of an interactive request. */
export const InteractivePayloadSchema = z.object({
  type: z.string(),
  token: z.string(),
  callback_id: z.string().optional(),
  user: z.object({ id: z.string(), team_id: z.string().optional() }).optional(),
  team: z.object({ id: z.string() }).optional(),
  actions: z
    .array(
      z.object({
        action_id: z.string().optional(),
        value: z.string().optional(),
      })
    )
    .optional(),
  response_url: z.string().optional(),
});

/** The response of the Slack oauth.access method. */
export const OAuthAccessSchema = z.object({
  access_token: z.string(),
  scope: z.string(),
  team_id: z.string(),
  user_id: z.string(),
  incoming_webhook: z
    .object({
      url: z.string(),
      channel: z.string(),
      channel_id: z.string(),
    })
    .optional(),
});
