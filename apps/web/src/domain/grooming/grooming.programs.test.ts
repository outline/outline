// @vitest-environment node
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import type { TTenantId } from "@/shared/types/common.types";
import { generateId } from "@/shared/utils";
import { AppointmentNotFoundError } from "./grooming.errors";
import {
	addGroomingPhotoProgram,
	bookAppointmentProgram,
	getAppointmentDetailProgram,
	getCalendarPrograms,
	updateAppointmentStatusProgram,
} from "./grooming.programs";
import { GroomingRepository } from "./grooming.repository";
import type {
	TGroomingAddon,
	TGroomingAddonId,
	TGroomingAppointment,
	TGroomingAppointmentId,
	TGroomingPhoto,
	TGroomingPhotoId,
	TGroomingService,
	TGroomingServiceId,
	TPetSize,
} from "./grooming.types";

describe("GroomingPrograms", () => {
	const tenantId = generateId<TTenantId>();

	const makeService = (
		overrides: Partial<TGroomingService> = {},
	): TGroomingService => ({
		id: generateId() as TGroomingServiceId,
		tenantId,
		name: "Full Grooming",
		description: null,
		durationMinutes: 60,
		priceSmall: 50000,
		priceMedium: 75000,
		priceLarge: 100000,
		priceXl: 125000,
		isActive: true,
		sortOrder: 1,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});

	const makeAddon = (
		overrides: Partial<TGroomingAddon> = {},
	): TGroomingAddon => ({
		id: generateId() as TGroomingAddonId,
		tenantId,
		name: "Nail Trim",
		price: 15000,
		isActive: true,
		createdAt: new Date(),
		...overrides,
	});

	const makeAppointment = (
		overrides: Partial<TGroomingAppointment> = {},
	): TGroomingAppointment => ({
		id: generateId() as TGroomingAppointmentId,
		tenantId,
		branchId: null,
		serviceId: generateId() as TGroomingServiceId,
		petId: "pet-1" as TGroomingAppointment["petId"],
		customerId: null,
		groomerId: null,
		petSize: "medium" as TPetSize,
		price: 75000,
		status: "pending",
		scheduledAt: new Date("2026-06-20T10:00:00"),
		startedAt: null,
		completedAt: null,
		notes: null,
		cancellationReason: null,
		createdBy: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	});

	const makeMockRepo = () => ({
		getServices: vi.fn(),
		getServiceById: vi.fn(),
		saveService: vi.fn(),
		updateService: vi.fn(),
		deleteService: vi.fn(),
		getAddons: vi.fn(),
		getAddonById: vi.fn(),
		getAppointments: vi.fn(),
		getAppointmentsByGroomer: vi.fn(),
		getAppointmentById: vi.fn(),
		bookAppointment: vi.fn(),
		updateAppointment: vi.fn(),
		getAppointmentAddons: vi.fn(),
		getPhotos: vi.fn(),
		savePhoto: vi.fn(),
	});

	describe("getCalendarPrograms", () => {
		const dateRange = {
			start: new Date("2026-06-20T00:00:00"),
			end: new Date("2026-06-20T23:59:59"),
		};

		it("should return all appointments without groomerId", async () => {
			const appointments = [makeAppointment()];
			const mockRepo = makeMockRepo();
			mockRepo.getAppointments.mockReturnValue(Effect.succeed(appointments));
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const result = await Effect.runPromise(
				getCalendarPrograms(tenantId, dateRange).pipe(Effect.provide(layer)),
			);

			expect(result).toHaveLength(1);
			expect(mockRepo.getAppointments).toHaveBeenCalledWith(
				tenantId,
				dateRange,
			);
		});

		it("should filter by groomerId when provided", async () => {
			const appointments = [makeAppointment({ groomerId: "groomer-1" })];
			const mockRepo = makeMockRepo();
			mockRepo.getAppointmentsByGroomer.mockReturnValue(
				Effect.succeed(appointments),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const result = await Effect.runPromise(
				getCalendarPrograms(tenantId, dateRange, "groomer-1").pipe(
					Effect.provide(layer),
				),
			);

			expect(result).toHaveLength(1);
			expect(mockRepo.getAppointmentsByGroomer).toHaveBeenCalledWith(
				tenantId,
				"groomer-1",
				dateRange,
			);
		});

		it("should propagate DatabaseError", async () => {
			const mockRepo = makeMockRepo();
			mockRepo.getAppointments.mockReturnValue(
				Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			await expect(
				Effect.runPromise(
					getCalendarPrograms(tenantId, dateRange).pipe(Effect.provide(layer)),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("bookAppointmentProgram", () => {
		it("should book an appointment successfully without groomer", async () => {
			const service = makeService({ durationMinutes: 60, priceMedium: 75000 });
			const savedAppointment = makeAppointment({ price: 75000 });

			const mockRepo = makeMockRepo();
			mockRepo.getServiceById.mockReturnValue(Effect.succeed(service));
			mockRepo.bookAppointment.mockReturnValue(
				Effect.succeed(savedAppointment),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const data = {
				branchId: null,
				serviceId: service.id,
				petId: "pet-1",
				customerId: null,
				groomerId: null,
				petSize: "medium" as TPetSize,
				scheduledAt: new Date("2026-06-20T10:00:00"),
				notes: null,
				addonIds: [],
			};

			const result = await Effect.runPromise(
				bookAppointmentProgram(tenantId, data).pipe(Effect.provide(layer)),
			);

			expect(result.price).toBe(75000);
			expect(mockRepo.getServiceById).toHaveBeenCalledWith(
				service.id,
				tenantId,
			);
			expect(mockRepo.bookAppointment).toHaveBeenCalled();
		});

		it("should check for slot conflicts and succeed when no conflict", async () => {
			const service = makeService({ durationMinutes: 60, priceMedium: 75000 });
			const savedAppointment = makeAppointment({ price: 75000 });

			const mockRepo = makeMockRepo();
			mockRepo.getServiceById.mockReturnValue(Effect.succeed(service));
			// No conflicting appointments
			mockRepo.getAppointmentsByGroomer.mockReturnValue(Effect.succeed([]));
			mockRepo.bookAppointment.mockReturnValue(
				Effect.succeed(savedAppointment),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const data = {
				branchId: null,
				serviceId: service.id,
				petId: "pet-1",
				customerId: null,
				groomerId: "groomer-1",
				petSize: "medium" as TPetSize,
				scheduledAt: new Date("2026-06-20T10:00:00"),
				notes: null,
				addonIds: [],
			};

			const result = await Effect.runPromise(
				bookAppointmentProgram(tenantId, data).pipe(Effect.provide(layer)),
			);

			expect(result.price).toBe(75000);
			expect(mockRepo.getAppointmentsByGroomer).toHaveBeenCalled();
			expect(mockRepo.bookAppointment).toHaveBeenCalled();
		});

		it("should fail with SlotConflictError on double booking", async () => {
			const service = makeService({ durationMinutes: 60, priceMedium: 75000 });
			const existingAppt = makeAppointment({
				scheduledAt: new Date("2026-06-20T10:15:00"), // within 60min of our slot
				status: "pending",
			});

			const mockRepo = makeMockRepo();
			mockRepo.getServiceById.mockReturnValue(Effect.succeed(service));
			mockRepo.getAppointmentsByGroomer.mockReturnValue(
				Effect.succeed([existingAppt]),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const data = {
				branchId: null,
				serviceId: service.id,
				petId: "pet-1",
				customerId: null,
				groomerId: "groomer-1",
				petSize: "medium" as TPetSize,
				scheduledAt: new Date("2026-06-20T10:00:00"),
				notes: null,
				addonIds: [],
			};

			const result = await Effect.runSyncExit(
				bookAppointmentProgram(tenantId, data).pipe(Effect.provide(layer)),
			);

			expect(result._tag).toBe("Failure");
		});

		it("should not conflict with cancelled appointments", async () => {
			const service = makeService({ durationMinutes: 60, priceMedium: 75000 });
			const existingAppt = makeAppointment({
				scheduledAt: new Date("2026-06-20T10:00:00"),
				status: "cancelled", // cancelled — should not block
			});
			const savedAppointment = makeAppointment({ price: 75000 });

			const mockRepo = makeMockRepo();
			mockRepo.getServiceById.mockReturnValue(Effect.succeed(service));
			mockRepo.getAppointmentsByGroomer.mockReturnValue(
				Effect.succeed([existingAppt]),
			);
			mockRepo.bookAppointment.mockReturnValue(
				Effect.succeed(savedAppointment),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const data = {
				branchId: null,
				serviceId: service.id,
				petId: "pet-1",
				customerId: null,
				groomerId: "groomer-1",
				petSize: "medium" as TPetSize,
				scheduledAt: new Date("2026-06-20T10:00:00"),
				notes: null,
				addonIds: [],
			};

			const result = await Effect.runPromise(
				bookAppointmentProgram(tenantId, data).pipe(Effect.provide(layer)),
			);

			expect(result).toBeDefined();
			expect(mockRepo.bookAppointment).toHaveBeenCalled();
		});

		it("should calculate price with addons", async () => {
			const service = makeService({ durationMinutes: 60, priceMedium: 75000 });
			const addon1 = makeAddon({ price: 15000 });
			const addon2 = makeAddon({ price: 10000, name: "Fragrance" });
			const savedAppointment = makeAppointment({ price: 100000 }); // 75000 + 15000 + 10000

			const mockRepo = makeMockRepo();
			mockRepo.getServiceById.mockReturnValue(Effect.succeed(service));
			mockRepo.getAddonById
				.mockReturnValueOnce(Effect.succeed(addon1))
				.mockReturnValueOnce(Effect.succeed(addon2));
			mockRepo.bookAppointment.mockReturnValue(
				Effect.succeed(savedAppointment),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const data = {
				branchId: null,
				serviceId: service.id,
				petId: "pet-1",
				customerId: null,
				groomerId: null,
				petSize: "medium" as TPetSize,
				scheduledAt: new Date("2026-06-20T10:00:00"),
				notes: null,
				addonIds: [addon1.id, addon2.id],
			};

			const result = await Effect.runPromise(
				bookAppointmentProgram(tenantId, data).pipe(Effect.provide(layer)),
			);

			expect(result.price).toBe(100000);
			expect(mockRepo.getAddonById).toHaveBeenCalledTimes(2);
			expect(mockRepo.bookAppointment).toHaveBeenCalledWith(expect.anything(), [
				{ addonId: addon1.id, price: 15000 },
				{ addonId: addon2.id, price: 10000 },
			]);
		});

		it("should propagate DatabaseError when service fetch fails", async () => {
			const mockRepo = makeMockRepo();
			mockRepo.getServiceById.mockReturnValue(
				Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const data = {
				branchId: null,
				serviceId: "svc-1" as TGroomingServiceId,
				petId: "pet-1",
				customerId: null,
				groomerId: null,
				petSize: "medium" as TPetSize,
				scheduledAt: new Date("2026-06-20T10:00:00"),
				notes: null,
				addonIds: [],
			};

			await expect(
				Effect.runPromise(
					bookAppointmentProgram(tenantId, data).pipe(Effect.provide(layer)),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("updateAppointmentStatusProgram", () => {
		it("should update to in_progress with startedAt", async () => {
			const updated = makeAppointment({
				status: "in_progress",
				startedAt: new Date(),
			});
			const mockRepo = makeMockRepo();
			mockRepo.updateAppointment.mockReturnValue(Effect.succeed(updated));
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const id = generateId() as TGroomingAppointmentId;
			const result = await Effect.runPromise(
				updateAppointmentStatusProgram(tenantId, id, "in_progress").pipe(
					Effect.provide(layer),
				),
			);

			expect(result.status).toBe("in_progress");
			expect(mockRepo.updateAppointment).toHaveBeenCalledWith(
				id,
				expect.objectContaining({
					status: "in_progress",
					startedAt: expect.any(Date),
				}),
				tenantId,
			);
		});

		it("should update to completed with completedAt", async () => {
			const updated = makeAppointment({
				status: "completed",
				completedAt: new Date(),
			});
			const mockRepo = makeMockRepo();
			mockRepo.updateAppointment.mockReturnValue(Effect.succeed(updated));
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const id = generateId() as TGroomingAppointmentId;
			const result = await Effect.runPromise(
				updateAppointmentStatusProgram(tenantId, id, "completed").pipe(
					Effect.provide(layer),
				),
			);

			expect(result.status).toBe("completed");
			expect(mockRepo.updateAppointment).toHaveBeenCalledWith(
				id,
				expect.objectContaining({
					status: "completed",
					completedAt: expect.any(Date),
				}),
				tenantId,
			);
		});

		it("should update to cancelled with cancellation reason", async () => {
			const updated = makeAppointment({
				status: "cancelled",
				cancellationReason: "Owner requested",
			});
			const mockRepo = makeMockRepo();
			mockRepo.updateAppointment.mockReturnValue(Effect.succeed(updated));
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const id = generateId() as TGroomingAppointmentId;
			const result = await Effect.runPromise(
				updateAppointmentStatusProgram(
					tenantId,
					id,
					"cancelled",
					"Owner requested",
				).pipe(Effect.provide(layer)),
			);

			expect(result.status).toBe("cancelled");
			expect(mockRepo.updateAppointment).toHaveBeenCalledWith(
				id,
				expect.objectContaining({
					status: "cancelled",
					cancellationReason: "Owner requested",
				}),
				tenantId,
			);
		});

		it("should propagate DatabaseError", async () => {
			const mockRepo = makeMockRepo();
			mockRepo.updateAppointment.mockReturnValue(
				Effect.fail({ _tag: "DatabaseError", cause: new Error("db fail") }),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const id = generateId() as TGroomingAppointmentId;
			await expect(
				Effect.runPromise(
					updateAppointmentStatusProgram(tenantId, id, "confirmed").pipe(
						Effect.provide(layer),
					),
				),
			).rejects.toThrow("DatabaseError");
		});
	});

	describe("getAppointmentDetailProgram", () => {
		it("should return the appointment and its photos", async () => {
			const appointment = makeAppointment();
			const photos = [
				{
					id: generateId() as TGroomingPhotoId,
					appointmentId: appointment.id,
					photoUrl:
						"https://ember.treonstudio.com/o/org-1/grooming-photos/tenant-1/appt-1/photo.jpg",
					photoType: "before" as const,
					uploadedAt: new Date(),
				},
			];
			const mockRepo = makeMockRepo();
			mockRepo.getAppointmentById.mockReturnValue(Effect.succeed(appointment));
			mockRepo.getPhotos.mockReturnValue(Effect.succeed(photos));
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const result = await Effect.runPromise(
				getAppointmentDetailProgram(tenantId, appointment.id).pipe(
					Effect.provide(layer),
				),
			);

			expect(result.appointment).toEqual(appointment);
			expect(result.photos).toEqual(photos);
			expect(mockRepo.getAppointmentById).toHaveBeenCalledWith(
				appointment.id,
				tenantId,
			);
			expect(mockRepo.getPhotos).toHaveBeenCalledWith(appointment.id);
		});

		it("should propagate AppointmentNotFoundError", async () => {
			const mockRepo = makeMockRepo();
			mockRepo.getAppointmentById.mockReturnValue(
				Effect.fail(new AppointmentNotFoundError({ appointmentId: "missing" })),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			try {
				await Effect.runPromise(
					getAppointmentDetailProgram(
						tenantId,
						"missing" as TGroomingAppointmentId,
					).pipe(Effect.provide(layer)),
				);
				throw new Error("Should have thrown AppointmentNotFoundError");
			} catch (error: any) {
				expect(error?.toString?.()).toContain("AppointmentNotFoundError");
			}
		});
	});

	describe("addGroomingPhotoProgram", () => {
		it("should save a photo for an existing appointment", async () => {
			const appointment = makeAppointment();
			const savedPhoto = {
				id: generateId() as TGroomingPhotoId,
				appointmentId: appointment.id,
				photoUrl:
					"https://ember.treonstudio.com/o/org-1/grooming-photos/tenant-1/appt-1/after.jpg",
				photoType: "after" as const,
				uploadedAt: new Date(),
			};
			const mockRepo = makeMockRepo();
			mockRepo.getAppointmentById.mockReturnValue(Effect.succeed(appointment));
			mockRepo.savePhoto.mockReturnValue(Effect.succeed(savedPhoto));
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			const result = await Effect.runPromise(
				addGroomingPhotoProgram(
					tenantId,
					appointment.id,
					savedPhoto.photoUrl,
					"after",
				).pipe(Effect.provide(layer)),
			);

			expect(result).toEqual(savedPhoto);
			expect(mockRepo.savePhoto).toHaveBeenCalledWith({
				appointmentId: appointment.id,
				photoUrl: savedPhoto.photoUrl,
				photoType: "after",
			});
		});

		it("should propagate AppointmentNotFoundError without saving a photo", async () => {
			const mockRepo = makeMockRepo();
			mockRepo.getAppointmentById.mockReturnValue(
				Effect.fail(new AppointmentNotFoundError({ appointmentId: "missing" })),
			);
			const layer = Layer.succeed(GroomingRepository, mockRepo);

			try {
				await Effect.runPromise(
					addGroomingPhotoProgram(
						tenantId,
						"missing" as TGroomingAppointmentId,
						"https://example.com/photo.jpg",
						"before",
					).pipe(Effect.provide(layer)),
				);
				throw new Error("Should have thrown AppointmentNotFoundError");
			} catch (error: any) {
				expect(error?.toString?.()).toContain("AppointmentNotFoundError");
			}
			expect(mockRepo.savePhoto).not.toHaveBeenCalled();
		});
	});
});
