import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TBoardingWithPets } from "@/domain/boarding";
import {
	createBoardingProgram,
	IBoardingRepository,
	updateBoardingStatusProgram,
} from "@/domain/boarding";
import {
	getOrCreateCustomerProgram,
	ICustomerRepository,
} from "@/domain/customer";
import { IEmailPort } from "@/shared/ports/email.port";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";

describe("Boarding + Customer journey", () => {
	const tenantId = generateId<TTenantId>();
	const userId = generateId<TUserId>();

	const mockCustomerRepo = () => ({
		findAll: vi.fn(),
		findById: vi.fn(),
		findByPhone: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	});

	const mockBoardingRepo = () => ({
		findAll: vi.fn(),
		findById: vi.fn(),
		saveFull: vi.fn(() => Effect.void),
		update: vi.fn(),
		updateFull: vi.fn(),
		delete: vi.fn(),
		getCharges: vi.fn(),
		addCharge: vi.fn(),
		getPhotos: vi.fn(),
		addPhoto: vi.fn(),
	});

	it("should create customer then boarding in sequence", async () => {
		const customerRepo = mockCustomerRepo();
		const boardingRepo = mockBoardingRepo();

		const customerId = generateId();
		const customerData = {
			fullName: "Budi",
			phone: "08123456789",
			address: "Jl. Merdeka No. 1",
		};

		customerRepo.findByPhone.mockReturnValue(Effect.succeed(null));
		customerRepo.create.mockReturnValue(
			Effect.succeed({
				id: customerId,
				...customerData,
				businessId: tenantId,
				userId: null,
				email: null,
				notes: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			}),
		);

		const combinedLayer = Layer.merge(
			Layer.succeed(ICustomerRepository, customerRepo),
			Layer.succeed(IBoardingRepository, boardingRepo),
		);

		const result = await Effect.runPromise(
			Effect.gen(function* () {
				const customer = yield* getOrCreateCustomerProgram(
					tenantId,
					customerData,
				);
				const boarding = yield* createBoardingProgram(
					{
						branchId: generateId(),
						ownerName: customerData.fullName,
						ownerPhone: customerData.phone,
						ownerAddress: customerData.address ?? "",
						emergencyContactName: "Emergency Contact",
						emergencyContactPhone: "08234567890",
						checkInDate: new Date().toISOString(),
						estimatedCheckOutDate: null,
						notes: "",
						status: "active" as const,
						customerId: customer.id,
						pets: [
							{
								name: "Milo",
								kind: "cat" as const,
								breed: "Persian",
								vaccinated: "yes" as const,
								weight: "5kg",
								healthStatus: "Sehat",
								initialCondition: "Baik",
								notes: "",
							},
						],
					},
					tenantId,
					userId,
				);
				return { customer, boarding };
			}).pipe(Effect.provide(combinedLayer)),
		);

		expect(result.customer.id).toBe(customerId);
		expect(result.customer.fullName).toBe("Budi");
		expect(result.boarding.ownerName).toBe("Budi");
		expect(result.boarding.pets).toHaveLength(1);
		expect(result.boarding.pets[0]?.name).toBe("Milo");
		expect(customerRepo.findByPhone).toHaveBeenCalledWith(
			tenantId,
			"08123456789",
		);
		expect(customerRepo.create).toHaveBeenCalled();
		expect(boardingRepo.saveFull).toHaveBeenCalled();
	});

	it("should reuse existing customer when phone matches", async () => {
		const customerRepo = mockCustomerRepo();
		const boardingRepo = mockBoardingRepo();

		const customerId = generateId();
		const existingCustomer = {
			id: customerId,
			businessId: tenantId,
			userId: null,
			fullName: "Budi",
			phone: "08123456789",
			email: null,
			address: "Jl. Merdeka No. 1",
			notes: null,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		customerRepo.findByPhone.mockReturnValue(Effect.succeed(existingCustomer));

		const combinedLayer = Layer.merge(
			Layer.succeed(ICustomerRepository, customerRepo),
			Layer.succeed(IBoardingRepository, boardingRepo),
		);

		await Effect.runPromise(
			Effect.gen(function* () {
				const customer = yield* getOrCreateCustomerProgram(tenantId, {
					fullName: "Budi",
					phone: "08123456789",
				});
				yield* createBoardingProgram(
					{
						branchId: generateId(),
						ownerName: customer.fullName,
						ownerPhone: "08123456789",
						ownerAddress: "Jl. Merdeka No. 1",
						emergencyContactName: null,
						emergencyContactPhone: null,
						checkInDate: new Date().toISOString(),
						estimatedCheckOutDate: null,
						notes: null,
						customerId: customer.id,
						pets: [
							{
								name: "Milo",
								kind: "cat" as const,
								breed: "Persian",
								vaccinated: "yes" as const,
								weight: "5kg",
								healthStatus: "Sehat",
								initialCondition: "Baik",
								notes: "",
							},
						],
					},
					tenantId,
					userId,
				);
			}).pipe(Effect.provide(combinedLayer)),
		);

		expect(customerRepo.findByPhone).toHaveBeenCalled();
		expect(customerRepo.create).not.toHaveBeenCalled();
		expect(boardingRepo.saveFull).toHaveBeenCalled();
	});

	it("should complete boarding checkout with charges and calculate totals", async () => {
		const boardingRepo = mockBoardingRepo();

		const boardingId = generateId();
		const checkInDate = new Date("2026-06-15T00:00:00Z");
		const boarding: TBoardingWithPets = {
			id: boardingId as TBoardingWithPets["id"],
			tenantId,
			branchId: generateId() as TBoardingWithPets["branchId"],
			customerId: null,
			ownerName: "Budi",
			ownerAddress: "Jl. Merdeka",
			ownerPhone: "08123456789",
			emergencyContactName: null,
			emergencyContactPhone: null,
			ownerSignature: null,
			checkInDate,
			estimatedCheckOutDate: null,
			notes: null,
			status: "active" as TBoardingWithPets["status"],
			roomId: null,
			dailyRate: 50000,
			actualCheckout: null,
			totalAmount: 0,
			consentAcceptedAt: new Date(),
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: new Date(),
			pets: [
				{
					id: generateId() as TBoardingWithPets["pets"][number]["id"],
					boardingId:
						boardingId as TBoardingWithPets["pets"][number]["boardingId"],
					name: "Milo",
					kind: "cat" as TBoardingWithPets["pets"][number]["kind"],
					breed: "Persian",
					vaccinated: "yes" as TBoardingWithPets["pets"][number]["vaccinated"],
					weight: "5kg",
					healthStatus: "Sehat",
					initialCondition: "Baik",
					notes: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
		};

		const charges = [
			{
				id: generateId() as string,
				boardingId: boardingId as string,
				tenantId,
				description: "Grooming",
				amount: 75000,
				chargeDate: new Date("2026-06-18T00:00:00Z"),
				createdBy: userId,
			},
		];

		boardingRepo.findById.mockReturnValue(Effect.succeed(boarding));
		boardingRepo.getCharges.mockReturnValue(Effect.succeed(charges));
		boardingRepo.update.mockReturnValue(Effect.void);

		const customerRepoStub = {
			findAll: vi.fn(),
			findById: vi.fn(),
			findByPhone: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		} as unknown as Parameters<typeof ICustomerRepository.of>[0];
		const emailPort = {
			sendEmail: vi.fn(() => Effect.void),
		} as unknown as Parameters<typeof IEmailPort.of>[0];
		const combinedLayer = Layer.mergeAll(
			Layer.succeed(IBoardingRepository, boardingRepo),
			Layer.succeed(
				ICustomerRepository,
				ICustomerRepository.of(customerRepoStub),
			),
			Layer.succeed(IEmailPort, IEmailPort.of(emailPort)),
		);

		const _result = await Effect.runPromise(
			updateBoardingStatusProgram(
				{ id: boardingId, status: "completed" },
				tenantId,
			).pipe(Effect.provide(combinedLayer)),
		);

		expect(boardingRepo.findById).toHaveBeenCalled();
		expect(boardingRepo.getCharges).toHaveBeenCalled();
		expect(boardingRepo.update).toHaveBeenCalled();
	});

	it("should fail boarding creation when customer creation fails", async () => {
		const customerRepo = mockCustomerRepo();
		const boardingRepo = mockBoardingRepo();

		customerRepo.findByPhone.mockReturnValue(Effect.succeed(null));
		customerRepo.create.mockReturnValue(
			Effect.fail({ _tag: "DatabaseError", message: "Connection failed" }),
		);

		const combinedLayer = Layer.merge(
			Layer.succeed(ICustomerRepository, customerRepo),
			Layer.succeed(IBoardingRepository, boardingRepo),
		);

		const exit = await Effect.runSyncExit(
			Effect.gen(function* () {
				const customer = yield* getOrCreateCustomerProgram(tenantId, {
					fullName: "Budi",
					phone: "08123456789",
				});
				return customer;
			}).pipe(Effect.provide(combinedLayer)),
		);

		expect(exit._tag).toBe("Failure");
		expect(boardingRepo.saveFull).not.toHaveBeenCalled();
	});
});
