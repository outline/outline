import { Effect } from "effect";
import { IBranchRepository } from "@/domain/branch";
import type { DatabaseError } from "@/shared/errors/infrastructure.errors";
import { IEmailPort } from "@/shared/ports/email.port";
import type {
	TBranchId,
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";
import { buildAccessGrantedEmail } from "./emails/access-granted.email";
import type { TStaffMemberDto } from "./staff.dto";
import { toStaffMemberDto } from "./staff.dto";
import { UserNotRegisteredError } from "./staff.errors";
import { IStaffRepository } from "./staff.repository";
import type { InviteStaffCommand, RemoveStaffCommand } from "./staff.schemas";

export const getStaffMembersProgram = (
	tenantId: TTenantId,
): Effect.Effect<readonly TStaffMemberDto[], DatabaseError, IStaffRepository> =>
	Effect.gen(function* () {
		const repo = yield* IStaffRepository;
		const members = yield* repo.findAll(tenantId);
		return members.map(toStaffMemberDto);
	});

export const setStaffActiveProgram = (
	tenantId: TTenantId,
	userId: TUserId,
	isActive: boolean,
) =>
	Effect.gen(function* () {
		const repo = yield* IStaffRepository;
		if (!repo.setActive) return false;
		return yield* repo.setActive(userId, tenantId, isActive);
	});

export const updateStaffProfileProgram = (
	tenantId: TTenantId,
	userId: TUserId,
	fullName: string,
	email: string,
) =>
	Effect.gen(function* () {
		const repo = yield* IStaffRepository;
		if (!repo.updateProfile) return false;
		return yield* repo.updateProfile(userId, tenantId, fullName, email);
	});

// Looking up the branch name is purely for personalizing the email body.
// The staff invite (repo.inviteStaff) has already been committed by the
// time this runs, so a failure here (branch lookup or send) must never
// fail the overall program - that would report the invite as failed to
// the caller even though the staff member was actually granted access.
const sendAccessGrantedEmail = (
	to: string,
	branchId: TBranchId,
	tenantId: TTenantId,
	targetUserId: TUserId,
	role: string,
): Effect.Effect<void, never, IBranchRepository | IEmailPort> =>
	Effect.gen(function* () {
		const branchRepo = yield* IBranchRepository;
		const branch = yield* branchRepo.findById(branchId, tenantId);
		const emailPort = yield* IEmailPort;
		const { subject, text, html } = buildAccessGrantedEmail(
			branch?.name ?? "cabang kami",
			role,
		);
		yield* emailPort.sendEmail({
			to,
			subject,
			text,
			html,
			idempotencyKey: `staff-invite:${tenantId}:${targetUserId}:${branchId}`,
		});
	}).pipe(Effect.catchAll(() => Effect.void));

export const inviteStaffProgram = (
	command: InviteStaffCommand,
	tenantId: TTenantId,
): Effect.Effect<
	void,
	DatabaseError | UserNotRegisteredError,
	IStaffRepository | IBranchRepository | IEmailPort
> =>
	Effect.gen(function* () {
		const repo = yield* IStaffRepository;

		const targetUserId = yield* repo.findUserIdByEmail(command.email);
		if (!targetUserId) {
			yield* Effect.fail(new UserNotRegisteredError({ email: command.email }));
		}

		if (targetUserId) {
			const branchId = command.branchId as TBranchId;
			yield* repo.inviteStaff(
				{
					userId: targetUserId,
					branchId,
					role: command.role as TUserRole,
				},
				tenantId,
			);

			yield* sendAccessGrantedEmail(
				command.email,
				branchId,
				tenantId,
				targetUserId,
				command.role,
			);
		}
	});

export const inviteStaffBatchProgram = (
	commands: readonly InviteStaffCommand[],
	tenantId: TTenantId,
): Effect.Effect<
	{ imported: number; skipped: number; errors: readonly string[] },
	DatabaseError,
	IStaffRepository | IBranchRepository | IEmailPort
> =>
	Effect.gen(function* () {
		let imported = 0;
		let skipped = 0;
		const errors: string[] = [];

		for (const command of commands) {
			const result = yield* Effect.either(
				inviteStaffProgram(command, tenantId),
			);

			if (result._tag === "Right") {
				imported++;
			} else {
				skipped++;
				const errMessage =
					result.left._tag === "UserNotRegisteredError"
						? `Email "${command.email}" belum terdaftar di platform.`
						: `Gagal mengundang "${command.email}": ${result.left._tag}`;
				errors.push(errMessage);
			}
		}

		return { imported, skipped, errors };
	});

export const removeStaffFromBranchProgram = (
	command: RemoveStaffCommand,
	tenantId: TTenantId,
): Effect.Effect<void, DatabaseError, IStaffRepository> =>
	Effect.gen(function* () {
		const repo = yield* IStaffRepository;
		yield* repo.removeFromBranch(
			command.userId as TUserId,
			command.branchId as TBranchId,
			tenantId,
		);
	});
