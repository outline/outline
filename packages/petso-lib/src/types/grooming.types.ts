export interface TGroomingAppointmentDto {
	readonly id: string;
	readonly branchId: string | null;
	readonly serviceId: string;
	readonly petId: string;
	readonly customerId: string | null;
	readonly groomerId: string | null;
	readonly petSize: "small" | "medium" | "large" | "xl";
	readonly price: number;
	readonly status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
	readonly scheduledAt: string;
	readonly startedAt: string | null;
	readonly completedAt: string | null;
	readonly notes: string | null;
	readonly cancellationReason: string | null;
	readonly createdAt: string;
	readonly updatedAt: string;
}
