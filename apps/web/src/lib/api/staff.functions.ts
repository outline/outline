import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";
import {
	getStaffMembersProgram,
	inviteStaffProgram,
	removeStaffFromBranchProgram,
} from "@/domain/staff/staff.programs";
import {
	InviteStaffSchema,
	RemoveStaffSchema,
} from "@/domain/staff/staff.schemas";
import { requireDrizzleAuth } from "@/infra/auth/auth-middleware";
import { requireCapability } from "@/infra/auth/security-context";
import { runApp } from "@/infra/runtime/app.runtime";
import { triggerBackgroundProcess } from "@/infra/runtime/queue.runner";
import { IQueue } from "@/shared/ports/queue.port";
import { makeQueueIdempotencyKey } from "@/shared/utils/queue-idempotency";

const ImportRequestIdSchema = Schema.String.pipe(
	Schema.minLength(8),
	Schema.maxLength(200),
);

const InviteStaffBatchRequestSchema = Schema.Struct({
	importRequestId: ImportRequestIdSchema,
	rows: Schema.Array(InviteStaffSchema),
});

export const getStaffMembers = createServerFn({ method: "GET" })
	.middleware([requireDrizzleAuth])
	.handler(async ({ context }) => {
		const { tenantId } = context;
		return await runApp(getStaffMembersProgram(tenantId));
	});

export const inviteStaff = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(InviteStaffSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "staff:invite"));
		await runApp(inviteStaffProgram(data, tenantId));
		return { success: true };
	});

export const removeStaffFromBranch = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(RemoveStaffSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "staff:invite"));
		await runApp(removeStaffFromBranchProgram(data, tenantId));
		return { success: true };
	});

export const inviteStaffBatch = createServerFn({ method: "POST" })
	.middleware([requireDrizzleAuth])
	.validator(Schema.decodeUnknownSync(InviteStaffBatchRequestSchema))
	.handler(async ({ data, context }) => {
		const { tenantId } = context;
		await runApp(requireCapability(context, "staff:invite"));

		const jobId = await runApp(
			Effect.flatMap(IQueue, (queue) =>
				queue.enqueue(
					"invite_staff_batch",
					data.rows,
					tenantId,
					makeQueueIdempotencyKey({
						tenantId,
						operation: "invite_staff_batch",
						importRequestId: data.importRequestId,
					}),
				),
			),
		);

		let cfContext: unknown;
		try {
			const mod = "vinxi/http";
			const { getEvent } = await import(/* @vite-ignore */ mod);
			const event = getEvent() as Record<string, unknown>;
			const cfEvent = event?.context as Record<string, unknown> | undefined;
			cfContext = (cfEvent?.cloudflare as Record<string, unknown> | undefined)
				?.context;
		} catch {}

		triggerBackgroundProcess(
			jobId,
			cfContext as
				| { readonly waitUntil: (promise: Promise<unknown>) => void }
				| undefined,
		);

		return { success: true, jobId };
	});
