import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const APIKeysCreateSchema = BaseSchema.extend({
  body: z.object({
    /** API Key name */
    name: z.string(),
    /** API Key expiry date */
    expiresAt: z.coerce.date().optional(),
    /** A list of scopes that this API key has access to */
    scope: z.array(z.string()).optional(),
  }),
});

export type APIKeysCreateReq = z.infer<typeof APIKeysCreateSchema>;

export const APIKeysListSchema = BaseSchema.extend({
  body: z.object({
    /** The owner of the API key */
    userId: z.string().uuid().optional(),
  }),
});

export type APIKeysListReq = z.infer<typeof APIKeysListSchema>;

export const APIKeysDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** API Key Id */
    id: z.string().uuid(),
  }),
});

export type APIKeysDeleteReq = z.infer<typeof APIKeysDeleteSchema>;
