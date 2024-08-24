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

export type HooksUnfurlReq = z.infer<typeof HooksUnfurlSchema>;

export const HooksSlackCommandSchema = z.object({
  body: z.object({
    token: z.string(),
    team_id: z.string(),
    user_id: z.string(),
    text: z.string().optional().default(""),
  }),
});

export type HooksSlackCommandReq = z.infer<typeof HooksSlackCommandSchema>;

export const HooksInteractiveSchema = z.object({
  body: z.object({
    payload: z.string(),
  }),
});

export type HooksInteractiveReq = z.infer<typeof HooksInteractiveSchema>;
