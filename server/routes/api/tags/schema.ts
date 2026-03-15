import { z } from "zod";
import { BaseSchema } from "../schema";

export const TagsListSchema = BaseSchema.extend({
	body: z.object({
		query: z.string().optional(),
		limit: z.number().int().min(1).max(100).optional(),
	}),
});

export type TagsListReq = z.infer<typeof TagsListSchema>;

export const TagsCreateSchema = BaseSchema.extend({
	body: z.object({
		name: z.string().min(1).max(64),
		color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
	}),
});

export type TagsCreateReq = z.infer<typeof TagsCreateSchema>;

export const TagsUpdateSchema = BaseSchema.extend({
	body: z.object({
		id: z.uuid(),
		name: z.string().min(1).max(64),
		color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
	}),
});

export type TagsUpdateReq = z.infer<typeof TagsUpdateSchema>;

export const TagsDeleteSchema = BaseSchema.extend({
	body: z.object({
		id: z.uuid(),
		confirm: z.boolean().optional(),
	}),
});

export type TagsDeleteReq = z.infer<typeof TagsDeleteSchema>;

export const TagsUsageSchema = BaseSchema.extend({
	body: z.object({}),
});

export type TagsUsageReq = z.infer<typeof TagsUsageSchema>;
