import { and, eq, inArray } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	type appRole,
	branches,
	branchMembers,
	profiles,
	userRoles,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TBranchId,
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";
import { withRetry } from "@/shared/utils";
import { IStaffRepository } from "./staff.repository";
import type { TStaffMember } from "./staff.types";

type TProfileRow = typeof profiles.$inferSelect;
type TBranchRow = typeof branches.$inferSelect;
type TBranchMemberRow = typeof branchMembers.$inferSelect;
type TUserRoleRow = typeof userRoles.$inferSelect;

export const StaffRepositoryDrizzle = Layer.effect(
	IStaffRepository,
	Effect.map(IDrizzleClient, (db) =>
		IStaffRepository.of({
			findAll: (tenantId: TTenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const branchRows = await db
								.select({
									id: branches.id,
									name: branches.name,
								})
								.from(branches)
								.where(
									and(
										eq(branches.businessId, tenantId),
										eq(branches.isActive, true),
									),
								);

							if (branchRows.length === 0) return [];

							const branchIds = branchRows.map((b) => b.id);

							const profileRows = await db
								.select({
									userId: profiles.userId,
									fullName: profiles.fullName,
									email: profiles.email,
									isActive: profiles.isActive,
								})
								.from(profiles)
								.where(eq(profiles.businessId, tenantId));

							const roleRows = await db
								.select({
									userId: userRoles.userId,
									role: userRoles.role,
								})
								.from(userRoles)
								.where(eq(userRoles.businessId, tenantId));

							const memberRows = await db
								.select({
									userId: branchMembers.userId,
									branchId: branchMembers.branchId,
								})
								.from(branchMembers)
								.where(inArray(branchMembers.branchId, branchIds));

							const userMap = new Map<string, TStaffMember>();

							for (const p of profileRows as TProfileRow[]) {
								const uid = p.userId;
								const userRolesForUser =
									(roleRows as TUserRoleRow[]).filter(
										(r) => r.userId === uid,
									) || [];
								userMap.set(uid, {
									userId: uid as TUserId,
									fullName: p.fullName,
									email: p.email,
									isActive: p.isActive,
									role: (userRolesForUser[0]?.role || "kasir") as TUserRole,
									branches: [],
								});
							}

							for (const m of memberRows as TBranchMemberRow[]) {
								const uid = m.userId;
								const branch = (branchRows as TBranchRow[]).find(
									(b) => b.id === m.branchId,
								);
								if (branch) {
									const current = userMap.get(uid);
									if (current) {
										(
											current.branches as unknown as Array<{
												id: TBranchId;
												name: string;
											}>
										).push({
											id: branch.id as TBranchId,
											name: branch.name,
										});
									}
								}
							}

							return Array.from(userMap.values());
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			findUserIdByEmail: (email: string) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const rows = await db
								.select({ userId: profiles.userId })
								.from(profiles)
								.where(eq(profiles.email, email))
								.limit(1);

							const row = rows[0];
							return (row?.userId as TUserId) ?? null;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),

			inviteStaff: (params, tenantId) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							await db.transaction(async (tx) => {
								const branchRows = await tx
									.select({ id: branches.id })
									.from(branches)
									.where(
										and(
											eq(branches.id, params.branchId),
											eq(branches.businessId, tenantId),
										),
									)
									.for("update")
									.limit(1);

								if (branchRows.length === 0) {
									throw new Error(
										`Branch ${params.branchId} not found or does not belong to tenant ${tenantId}`,
									);
								}

								await tx
									.insert(branchMembers)
									.values({
										branchId: params.branchId,
										userId: params.userId,
									})
									.onConflictDoNothing({
										target: [branchMembers.branchId, branchMembers.userId],
									});

								await tx
									.insert(userRoles)
									.values({
										userId: params.userId,
										businessId: tenantId,
										role: params.role as (typeof appRole.enumValues)[number],
									})
									.onConflictDoNothing({
										target: [
											userRoles.userId,
											userRoles.businessId,
											userRoles.role,
										],
									});
							});
						},
						catch: (e) => new DatabaseError({ cause: e as Error }),
					}),
				),

			setActive: (userId, tenantId, isActive) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const result = await db
								.update(profiles)
								.set({ isActive, updatedAt: new Date().toISOString() })
								.where(
									and(
										eq(profiles.userId, userId),
										eq(profiles.businessId, tenantId),
									),
								)
								.returning({ id: profiles.id });
							return result.length > 0;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			updateProfile: (userId, tenantId, fullName, email) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const result = await db
								.update(profiles)
								.set({
									fullName,
									email,
									updatedAt: new Date().toISOString(),
								})
								.where(
									and(
										eq(profiles.userId, userId),
										eq(profiles.businessId, tenantId),
									),
								)
								.returning({ id: profiles.id });
							return result.length > 0;
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
			removeFromBranch: (
				userId: TUserId,
				branchId: TBranchId,
				tenantId: TTenantId,
			) =>
				withRetry(
					Effect.tryPromise({
						try: async () => {
							const branchRows = await db
								.select({ id: branches.id })
								.from(branches)
								.where(
									and(
										eq(branches.id, branchId),
										eq(branches.businessId, tenantId),
									),
								)
								.limit(1);

							if (branchRows.length === 0) {
								throw new Error(
									`Branch ${branchId} not found or does not belong to tenant ${tenantId}`,
								);
							}

							await db
								.delete(branchMembers)
								.where(
									and(
										eq(branchMembers.userId, userId),
										eq(branchMembers.branchId, branchId),
									),
								);
						},
						catch: (e) => new DatabaseError({ cause: e }),
					}),
				),
		}),
	),
);
