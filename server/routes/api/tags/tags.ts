import Router from "koa-router";
import { Op } from "sequelize";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { Tag, Document, DocumentTag } from "@server/models";
import { authorize } from "@server/policies";
import presentTag from "@server/presenters/tag";
import { presentPolicies } from "@server/presenters";
import type { APIContext } from "@server/types";
import { InvalidRequestError, NotFoundError } from "@server/errors";
import pagination from "../middlewares/pagination";
import * as T from "./schema";

const router = new Router();

router.post(
	"tags.list",
	auth(),
	pagination(),
	validate(T.TagsListSchema),
	async (ctx: APIContext<T.TagsListReq>) => {
		const { query } = ctx.input.body;
		const { user } = ctx.state.auth;

		const where: Record<string, unknown> = {
			teamId: user.teamId,
		};

		if (query) {
			where.name = {
				[Op.iLike]: `%${query.toLowerCase()}%`,
			};
		}

		const tags = await Tag.findAll({
			where,
			order: [["name", "ASC"]],
			offset: ctx.state.pagination.offset,
			limit: ctx.state.pagination.limit,
		});

		ctx.body = {
			pagination: ctx.state.pagination,
			data: tags.map((tag) => presentTag(tag)),
			policies: presentPolicies(user, tags),
		};
	}
);

router.post(
	"tags.create",
	auth(),
	validate(T.TagsCreateSchema),
	transaction(),
	async (ctx: APIContext<T.TagsCreateReq>) => {
		const { name, color } = ctx.input.body;
		const { user } = ctx.state.auth;
		const { transaction } = ctx.state;

		const normalizedName = name.toLowerCase().trim();

		const existing = await Tag.findOne({
			where: { teamId: user.teamId, name: normalizedName },
			transaction,
		});

		if (existing) {
			authorize(user, "read", existing);
			ctx.body = {
				data: presentTag(existing),
				policies: presentPolicies(user, [existing]),
			};
			return;
		}

		const tag = await Tag.build({
			teamId: user.teamId,
			name: normalizedName,
			color: color ?? null,
			createdById: user.id,
		});
		authorize(user, "create", tag);
		await tag.saveWithCtx(ctx);

		ctx.body = {
			data: presentTag(tag),
			policies: presentPolicies(user, [tag]),
		};
	}
);

router.post(
	"tags.update",
	auth(),
	validate(T.TagsUpdateSchema),
	transaction(),
	async (ctx: APIContext<T.TagsUpdateReq>) => {
		const { id, name, color } = ctx.input.body;
		const { user } = ctx.state.auth;
		const { transaction } = ctx.state;

		const tag = await Tag.findOne({
			where: { id, teamId: user.teamId },
			transaction,
			lock: transaction.LOCK.UPDATE,
		});

		if (!tag) {
			throw NotFoundError("Tag not found");
		}

		authorize(user, "update", tag);

		const updates: Record<string, unknown> = { name: name.toLowerCase().trim() };
		if (color !== undefined) {
			updates.color = color ?? null;
		}
		await tag.updateWithCtx(ctx, updates);

		ctx.body = {
			data: presentTag(tag),
			policies: presentPolicies(user, [tag]),
		};
	}
);

router.post(
	"tags.usage",
	auth(),
	validate(T.TagsUsageSchema),
	async (ctx: APIContext<T.TagsUsageReq>) => {
		const { user } = ctx.state.auth;

		const tags = await Tag.findAll({
			where: { teamId: user.teamId },
			order: [["name", "ASC"]],
		});

		const counts = await DocumentTag.findAll({
			where: { tagId: tags.map((t) => t.id) },
			attributes: ["tagId", [Tag.sequelize!.fn("COUNT", Tag.sequelize!.col("tagId")), "documentCount"]],
			group: ["tagId"],
			raw: true,
		}) as unknown as Array<{ tagId: string; documentCount: string }>;

		const countMap = new Map(counts.map((c) => [c.tagId, parseInt(c.documentCount, 10)]));

		ctx.body = {
			data: {
				tags: tags.map((tag) => ({
					id: tag.id,
					name: tag.name,
					color: tag.color ?? null,
					documentCount: countMap.get(tag.id) ?? 0,
				})),
			},
		};
	}
);

router.post(
	"tags.delete",
	auth(),
	validate(T.TagsDeleteSchema),
	transaction(),
	async (ctx: APIContext<T.TagsDeleteReq>) => {
		const { id, confirm } = ctx.input.body;
		const { user } = ctx.state.auth;
		const { transaction } = ctx.state;

		const tag = await Tag.findOne({
			where: { id, teamId: user.teamId },
			transaction,
			lock: transaction.LOCK.UPDATE,
		});

		if (!tag) {
			throw NotFoundError("Tag not found");
		}

		authorize(user, "delete", tag);

		if (!confirm) {
			const documentCount = await DocumentTag.count({
				where: { tagId: tag.id },
				transaction,
			});
			throw InvalidRequestError(
				`Deleting this tag will remove it from ${documentCount} document(s). Send confirm: true to proceed.`
			);
		}

		await DocumentTag.destroy({
			where: { tagId: tag.id },
			transaction,
		});

		await tag.destroyWithCtx(ctx);

		ctx.body = {
			success: true,
		};
	}
);

export default router;
