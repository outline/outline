import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { importProductsProgram } from "@/domain/product/product.programs";
import { createRoomProgram } from "@/domain/room/room.programs";
import { validateApiKey } from "@/infra/auth/api-auth";
import { hashPassword } from "@/infra/auth/password";
import { IDrizzleClient } from "@/infra/db/drizzle/client";
import {
	branches,
	branchMembers,
	profiles,
	userRoles,
	users,
} from "@/infra/db/drizzle/schema";
import { runApp } from "@/infra/runtime/app.runtime";
import { getResolvedConfig } from "@/shared/env/app.config";
import type { TTenantId } from "@/shared/types/common.types";

const isProduction = (workerEnv?: unknown): boolean => {
	const envRecord = workerEnv as Record<string, string | undefined>;
	return (
		envRecord?.NODE_ENV === "production" ||
		envRecord?.ENVIRONMENT === "production" ||
		getResolvedConfig().environment === "production"
	);
};

export const handlePostSeed = async (
	request: Request,
	workerEnv?: unknown,
): Promise<Response> => {
	if (isProduction(workerEnv)) {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Not Found",
			}),
			{
				status: 404,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const authHeader = request.headers.get("Authorization");
	const validation = await validateApiKey(authHeader);

	if (!validation) {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Unauthorized: Invalid or missing API key.",
			}),
			{
				status: 401,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		const generatedPassword = crypto.randomUUID
			? crypto.randomUUID().replace(/-/g, "").substring(0, 16)
			: Math.random().toString(36).substring(2, 18);
		const defaultPasswordHash = await hashPassword(generatedPassword);

		const result = await runApp(
			Effect.gen(function* () {
				const db = yield* IDrizzleClient;

				// 1. Resolve or create a default branch for this business
				let [branch] = yield* Effect.tryPromise({
					try: () =>
						db
							.select()
							.from(branches)
							.where(eq(branches.businessId, validation.businessId))
							.limit(1),
					catch: (e) => e,
				});

				if (!branch) {
					[branch] = yield* Effect.tryPromise({
						try: () =>
							db
								.insert(branches)
								.values({
									businessId: validation.businessId,
									name: "Pusat Jakarta",
									address: "Jl. Kemang Raya No. 10, Jakarta",
									phone: "021-9876543",
									isActive: true,
								})
								.returning(),
						catch: (e) => e,
					});
				}

				if (!branch) {
					throw new Error("Failed to resolve or create a business branch.");
				}

				const branchId = branch.id;

				// 2. Register and Seed 3 Staff Members in the database (Idempotent)
				const staffToSeed = [
					{
						email: "kasir@himajinhobby.com",
						fullName: "Budi Kasir",
						role: "kasir" as const,
					},
					{
						email: "daycare@himajinhobby.com",
						fullName: "Siti Daycare",
						role: "staff_daycare" as const,
					},
					{
						email: "manager@himajinhobby.com",
						fullName: "Andi Manager",
						role: "manager" as const,
					},
				];

				for (const staff of staffToSeed) {
					let [user] = yield* Effect.tryPromise({
						try: () =>
							db
								.select()
								.from(users)
								.where(eq(users.email, staff.email))
								.limit(1),
						catch: (e) => e,
					});

					if (!user) {
						[user] = yield* Effect.tryPromise({
							try: () =>
								db
									.insert(users)
									.values({
										email: staff.email,
										passwordHash: defaultPasswordHash,
									})
									.returning(),
							catch: (e) => e,
						});
					}

					if (!user) {
						throw new Error(`Failed to resolve or create user: ${staff.email}`);
					}

					yield* Effect.tryPromise({
						try: () =>
							db
								.insert(profiles)
								.values({
									userId: user.id,
									businessId: validation.businessId,
									fullName: staff.fullName,
									email: staff.email,
								})
								.onConflictDoUpdate({
									target: [profiles.userId],
									set: {
										fullName: staff.fullName,
										businessId: validation.businessId,
									},
								}),
						catch: (e) => e,
					});

					yield* Effect.tryPromise({
						try: () =>
							db
								.insert(userRoles)
								.values({
									userId: user.id,
									businessId: validation.businessId,
									role: staff.role,
								})
								.onConflictDoNothing(),
						catch: (e) => e,
					});

					yield* Effect.tryPromise({
						try: () =>
							db
								.insert(branchMembers)
								.values({
									branchId,
									userId: user.id,
								})
								.onConflictDoNothing(),
						catch: (e) => e,
					});
				}

				// 3. Seed 5 sample products
				const productsToImport = [
					{
						productId: "",
						name: "Makanan Kucing Premium",
						sku: "CAT-PREM-01",
						price: 75000,
						stock: 50,
						unit: "pcs" as const,
					},
					{
						productId: "",
						name: "Pasir Kucing Wangi 10L",
						sku: "CAT-LITR-02",
						price: 45000,
						stock: 20,
						unit: "pcs" as const,
					},
					{
						productId: "",
						name: "Shampoo Anti Kutu Hewan",
						sku: "PET-SHMP-03",
						price: 35000,
						stock: 15,
						unit: "pcs" as const,
					},
					{
						productId: "",
						name: "Mainan Tikus Berdecit",
						sku: "CAT-TOY-04",
						price: 15000,
						stock: 30,
						unit: "pcs" as const,
					},
					{
						productId: "",
						name: "Susu Kucing Lactose-Free",
						sku: "CAT-MILK-05",
						price: 25000,
						stock: 25,
						unit: "pcs" as const,
					},
				];

				const productResult = yield* importProductsProgram(
					productsToImport,
					validation.businessId as TTenantId,
				);

				// 4. Seed 3 sample rooms
				const roomsToSeed = [
					{
						name: "Kamar Standard Cat",
						roomType: "standard",
						capacity: 1,
						dailyRate: 50000,
						isActive: true,
					},
					{
						name: "Kamar Deluxe Cat",
						roomType: "deluxe",
						capacity: 2,
						dailyRate: 85000,
						isActive: true,
					},
					{
						name: "Kamar VIP Cat Suite",
						roomType: "vip",
						capacity: 4,
						dailyRate: 150000,
						isActive: true,
					},
				];

				let seededRooms = 0;
				for (const room of roomsToSeed) {
					const roomResult = yield* Effect.either(
						createRoomProgram(validation.businessId as TTenantId, {
							...room,
							branchId,
						}),
					);
					if (roomResult._tag === "Right") {
						seededRooms++;
					}
				}

				return {
					staffCount: staffToSeed.length,
					productsSeeded: productResult.imported,
					roomsSeeded: seededRooms,
					generatedPassword,
				};
			}) as Effect.Effect<{
				staffCount: number;
				productsSeeded: number;
				roomsSeeded: number;
				generatedPassword: string;
			}>,
		);

		console.log(
			"[API v1 Seed] Seed completed for business:",
			validation.businessId,
		);

		return new Response(
			JSON.stringify({
				success: true,
				message:
					"Seed data successfully populated for owner and staff members.",
				data: result,
			}),
			{
				status: 201,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("[API v1 Seed] Error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "Internal Server Error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
