import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId, TUserId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { ICustomerRepository } from "@/domain/customer";
import { IEmailPort } from "@/shared/ports/email.port";
import {
	addBoardingChargeProgram,
	createBoardingProgram,
	updateBoardingStatusProgram,
} from "./boarding.programs";
import { IBoardingRepository } from "./boarding.repository";
import type { AddBoardingChargeCommand } from "./boarding.schemas";

describe("BoardingPrograms", () => {
	const tenantId = generateId<TTenantId>();
	const userId = generateId<TUserId>();

	it("should orchestrate boarding creation", async () => {
		// Mock Repository
		const mockRepo = {
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
		} as unknown as Parameters<typeof IBoardingRepository.of>[0];

		const repoLayer = Layer.succeed(
			IBoardingRepository,
			IBoardingRepository.of(mockRepo),
		);

		const command = {
			branchId: generateId(),
			ownerName: "Alice",
			ownerPhone: "081",
			ownerAddress: "Jl. Alice",
			emergencyContactName: "Bob",
			emergencyContactPhone: "082",
			checkInDate: new Date().toISOString(),
			estimatedCheckOutDate: null,
			notes: "",
			status: "active" as const,
			pets: [
				{
					name: "Fluffy",
					kind: "cat" as const,
					breed: "Mixed",
					vaccinated: "yes" as const,
					weight: "4kg",
					healthStatus: "Healthy",
					initialCondition: "Good",
					notes: "",
				},
			],
		};

		const program = createBoardingProgram(command, tenantId, userId).pipe(
			Effect.provide(repoLayer),
		);

		const result = await Effect.runPromise(program);

		expect(result.ownerName).toBe("Alice");
		expect(mockRepo.saveFull).toHaveBeenCalled();
	});

	it("addBoardingChargeProgram forwards the charge to the repository", async () => {
		const addCharge = vi.fn(() => Effect.void);
		const mockRepo = {
			findAll: vi.fn(),
			findById: vi.fn(),
			saveFull: vi.fn(),
			update: vi.fn(),
			updateFull: vi.fn(),
			delete: vi.fn(),
			getCharges: vi.fn(),
			addCharge,
			getPhotos: vi.fn(),
			addPhoto: vi.fn(),
		} as unknown as Parameters<typeof IBoardingRepository.of>[0];

		const repoLayer = Layer.succeed(
			IBoardingRepository,
			IBoardingRepository.of(mockRepo),
		);

		const boardingId = generateId();
		const command: AddBoardingChargeCommand = {
			boardingId,
			description: "Grooming add-on",
			amount: 50000,
		};

		const program = addBoardingChargeProgram(command, tenantId, userId).pipe(
			Effect.provide(repoLayer),
		);

		const result = await Effect.runPromise(program);

		expect(result).toEqual({ success: true });
		expect(addCharge).toHaveBeenCalledWith(
			expect.objectContaining({
				boardingId,
				tenantId,
				description: "Grooming add-on",
				amount: 50000,
				createdBy: userId,
			}),
			tenantId,
		);
	});
});

describe("updateBoardingStatusProgram", () => {
	const tenantId = generateId<TTenantId>();
	const userId = generateId<TUserId>();

	it("sends a ready-for-pickup email when status transitions to completed", async () => {
		const boarding = {
			id: "boarding-1" as const,
			tenantId,
			branchId: generateId() as any,
			customerId: "customer-1",
			ownerName: "Ridho",
			ownerAddress: "Jl. Ridho",
			ownerPhone: "081",
			emergencyContactName: null,
			emergencyContactPhone: null,
			ownerSignature: null,
			checkInDate: new Date("2026-07-01"),
			estimatedCheckOutDate: null,
			notes: null,
			status: "active" as const,
			roomId: null,
			dailyRate: 100000,
			actualCheckout: null,
			totalAmount: 0,
			consentAcceptedAt: new Date(),
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: new Date(),
			pets: [{ id: "pet-1", boardingId: "boarding-1", name: "Milo" } as never],
		};

		const findById = vi.fn().mockReturnValue(Effect.succeed(boarding));
		const getCharges = vi.fn().mockReturnValue(Effect.succeed([]));
		const update = vi.fn().mockReturnValue(Effect.void);
		const boardingRepo = {
			findAll: vi.fn(),
			findById,
			saveFull: vi.fn(),
			update,
			updateFull: vi.fn(),
			delete: vi.fn(),
			getCharges,
			addCharge: vi.fn(),
			getPhotos: vi.fn(),
			addPhoto: vi.fn(),
		} as unknown as Parameters<typeof IBoardingRepository.of>[0];

		const findCustomerById = vi
			.fn()
			.mockReturnValue(
				Effect.succeed({ id: "customer-1", email: "ridho@example.com" }),
			);
		const customerRepo = {
			findAll: vi.fn(),
			findById: findCustomerById,
			findByPhone: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		} as unknown as Parameters<typeof ICustomerRepository.of>[0];

		const sendEmail = vi.fn().mockReturnValue(Effect.void);
		const emailPort = {
			sendEmail,
		} as unknown as Parameters<typeof IEmailPort.of>[0];

		const TestLayer = Layer.mergeAll(
			Layer.succeed(IBoardingRepository, IBoardingRepository.of(boardingRepo)),
			Layer.succeed(ICustomerRepository, ICustomerRepository.of(customerRepo)),
			Layer.succeed(IEmailPort, IEmailPort.of(emailPort)),
		);

		await Effect.runPromise(
			Effect.provide(
				updateBoardingStatusProgram(
					{ id: "boarding-1", status: "completed" },
					tenantId,
				),
				TestLayer,
			),
		);

		expect(findCustomerById).toHaveBeenCalledWith(tenantId, "customer-1");
		expect(sendEmail).toHaveBeenCalledTimes(1);
		expect(sendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "ridho@example.com",
				subject: expect.stringContaining("Milo"),
				idempotencyKey: "boarding:boarding-1:completed",
			}),
		);
	});

	it("does not send an email or fail when the boarding has no linked customer", async () => {
		const boarding = {
			id: "boarding-2" as const,
			tenantId,
			branchId: generateId() as any,
			customerId: null,
			ownerName: "Walk-in",
			ownerAddress: "",
			ownerPhone: "081",
			emergencyContactName: null,
			emergencyContactPhone: null,
			ownerSignature: null,
			checkInDate: new Date("2026-07-01"),
			estimatedCheckOutDate: null,
			notes: null,
			status: "active" as const,
			roomId: null,
			dailyRate: 100000,
			actualCheckout: null,
			totalAmount: 0,
			consentAcceptedAt: new Date(),
			createdBy: userId,
			createdAt: new Date(),
			updatedAt: new Date(),
			pets: [{ id: "pet-2", boardingId: "boarding-2", name: "Luna" } as never],
		};

		const findById = vi.fn().mockReturnValue(Effect.succeed(boarding));
		const getCharges = vi.fn().mockReturnValue(Effect.succeed([]));
		const update = vi.fn().mockReturnValue(Effect.void);
		const boardingRepo = {
			findAll: vi.fn(),
			findById,
			saveFull: vi.fn(),
			update,
			updateFull: vi.fn(),
			delete: vi.fn(),
			getCharges,
			addCharge: vi.fn(),
			getPhotos: vi.fn(),
			addPhoto: vi.fn(),
		} as unknown as Parameters<typeof IBoardingRepository.of>[0];

		const findCustomerById = vi.fn();
		const customerRepo = {
			findAll: vi.fn(),
			findById: findCustomerById,
			findByPhone: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		} as unknown as Parameters<typeof ICustomerRepository.of>[0];

		const sendEmail = vi.fn().mockReturnValue(Effect.void);
		const emailPort = {
			sendEmail,
		} as unknown as Parameters<typeof IEmailPort.of>[0];

		const TestLayer = Layer.mergeAll(
			Layer.succeed(IBoardingRepository, IBoardingRepository.of(boardingRepo)),
			Layer.succeed(ICustomerRepository, ICustomerRepository.of(customerRepo)),
			Layer.succeed(IEmailPort, IEmailPort.of(emailPort)),
		);

		await Effect.runPromise(
			Effect.provide(
				updateBoardingStatusProgram(
					{ id: "boarding-2", status: "completed" },
					tenantId,
				),
				TestLayer,
			),
		);

		expect(findCustomerById).not.toHaveBeenCalled();
		expect(sendEmail).not.toHaveBeenCalled();
	});
});
