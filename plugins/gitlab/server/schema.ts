import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const GitLabCallbackSchema = BaseSchema.extend({
  query: z
    .object({
      code: z.string().nullish(),
      state: z.string().uuid().nullish(),
      error: z.string().nullish(),
    })
    .refine((req) => !(isEmpty(req.code) && isEmpty(req.error)), {
      message: "one of code or error is required",
    }),
});

export type GitLabCallbackReq = z.infer<typeof GitLabCallbackSchema>;

export const AccessTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  created_at: z.number(),
});

export const UserInfoResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string(),
  avatar_url: z.string().url(),
});

export const projectsSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    namespace: z.object({
      id: z.number(),
      full_path: z.string(),
    }),
  })
);

const AuthorSchema = z.object({
  username: z.string(),
  avatar_url: z.string().url(),
});

export const IssueSchema = z.object({
  iid: z.number(),
  title: z.string(),
  description: z.string(),
  web_url: z.string().url(),
  state: z.string(),
  created_at: z.string().datetime(), // ISO 8601 datetime string
  author: AuthorSchema,
  labels: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
    })
  ),
});

export type Issue = z.infer<typeof IssueSchema>;

export const MRSchema = z.object({
  iid: z.number(),
  title: z.string(),
  description: z.string(),
  web_url: z.string().url(),
  state: z.string(),
  draft: z.boolean(),
  merged_at: z.string().datetime().nullable(), // Nullable ISO 8601 datetime string
  created_at: z.string().datetime(), // ISO 8601 datetime string
  author: AuthorSchema,
  labels: z.array(z.string()), // Labels are strings in MR
});

export type MR = z.infer<typeof MRSchema>;
