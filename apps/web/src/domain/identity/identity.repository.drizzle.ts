import { and, eq } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { normalizeEmail } from "@/infra/auth/email";
import { hashPassword, verifyPassword } from "@/infra/auth/password";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	branchMembers,
	branches,
	businesses,
	profiles,
	users,
} from "@/infra/db/drizzle/schema";
import { DatabaseError } from "@/shared/errors/infrastructure.errors";
import type {
	TTenantId,
	TUserId,
	TUserRole,
} from "@/shared/types/common.types";
import { IIdentityRepository } from "./identity.repository";

export const IdentityRepositoryDrizzle = Layer.effect(
	IIdentityRepository,
	Effect.map(IDrizzleClient, (db) =>
		IIdentityRepository.of({
			findProfileByUserId: (userId: TUserId) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.profiles.findFirst({
							where: { RAW: (p, { eq }) => eq(p.userId, userId) },
						});
						if (!row) return null;
						return {
							id: row.id,
							userId: row.userId as TUserId,
							businessId: row.businessId as TTenantId,
							fullName: row.fullName,
							email: row.email,
							createdAt: new Date(row.createdAt),
							updatedAt: new Date(row.updatedAt),
						};
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			updateProfile: (
				userId: TUserId,
				updates: { fullName: string; phoneNumber?: string },
			) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.update(profiles)
							.set({
								fullName: updates.fullName,
								...(updates.phoneNumber !== undefined && {
									phoneNumber: updates.phoneNumber,
								}),
								updatedAt: new Date().toISOString(),
							})
							.where(eq(profiles.userId, userId));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			updateEmail: (userId: TUserId, email: string) =>
				Effect.tryPromise({
					try: async () => {
						const normalizedEmail = normalizeEmail(email);
						await db
							.update(users)
							.set({
								email: normalizedEmail,
								updatedAt: new Date().toISOString(),
							})
							.where(eq(users.id, userId));
						await db
							.update(profiles)
							.set({
								email: normalizedEmail,
								updatedAt: new Date().toISOString(),
							})
							.where(eq(profiles.userId, userId));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findBusinessById: (id: TTenantId) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.businesses.findFirst({
							where: { RAW: (b, { eq }) => eq(b.id, id) },
						});
						if (!row) return null;
						return {
							id: row.id as TTenantId,
							name: row.name,
							slug: row.slug ?? null,
							logoUrl: row.logoUrl ?? null,
							signatureUrl: row.signatureUrl ?? null,
							address: row.address ?? null,
							phone: row.phone ?? null,
							createdAt: new Date(row.createdAt),
						};
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			updateBusiness: (
				id: TTenantId,
				updates: { name?: string; logo_url?: string; signature_url?: string },
			) =>
				Effect.tryPromise({
					try: async () => {
						await db
							.update(businesses)
							.set({
								...(updates.name !== undefined && { name: updates.name }),
								...(updates.logo_url !== undefined && {
									logoUrl: updates.logo_url,
								}),
								...(updates.signature_url !== undefined && {
									signatureUrl: updates.signature_url,
								}),
								updatedAt: new Date().toISOString(),
							})
							.where(eq(businesses.id, id));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			checkRole: (userId: TUserId, businessId: TTenantId, role: TUserRole) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.userRoles.findFirst({
							where: (ur, { and, eq }) =>
								and(
									eq(ur.userId, userId),
									eq(ur.businessId, businessId),
									eq(ur.role, role),
								),
						});
						return !!row;
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			findBranchesForUser: (userId: TUserId) =>
				Effect.tryPromise({
					try: async () => {
						const rows = await db
							.select({ id: branches.id, name: branches.name })
							.from(branchMembers)
							.innerJoin(branches, eq(branches.id, branchMembers.branchId))
							.where(
								and(
									eq(branchMembers.userId, userId),
									eq(branches.isActive, true),
								),
							);
						return rows;
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			hasPinSet: (userId: TUserId) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.profiles.findFirst({
							columns: { pinHash: true },
							where: { RAW: (p, { eq }) => eq(p.userId, userId) },
						});
						return !!row?.pinHash;
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			verifyCurrentPassword: (userId: TUserId, currentPassword: string) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.users.findFirst({
							where: { RAW: (u, { eq }) => eq(u.id, userId) },
						});
						if (!row) return false;
						return verifyPassword(currentPassword, row.passwordHash);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			changePassword: (userId: TUserId, password: string) =>
				Effect.tryPromise({
					try: async () => {
						const passwordHash = await hashPassword(password);
						await db
							.update(users)
							.set({ passwordHash, updatedAt: new Date().toISOString() })
							.where(eq(users.id, userId));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			verifyPin: (userId: TUserId, pin: string) =>
				Effect.tryPromise({
					try: async () => {
						const row = await db.query.profiles.findFirst({
							where: { RAW: (p, { eq }) => eq(p.userId, userId) },
						});
						if (!row?.pinHash) return false;
						// PIN uses the same scrypt hashing as passwords — it's a
						// short numeric secret, but the comparison must still be
						// constant-time, which verifyPassword already provides.
						return verifyPassword(pin, row.pinHash);
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),

			setPin: (userId: TUserId, pin: string) =>
				Effect.tryPromise({
					try: async () => {
						const pinHash = await hashPassword(pin);
						await db
							.update(profiles)
							.set({ pinHash })
							.where(eq(profiles.userId, userId));
					},
					catch: (e) => new DatabaseError({ cause: e }),
				}),
		}),
	),
);
