import type { TTenantId } from "@/shared/types/common.types";
import type { TSupplier, TSupplierId } from "./supplier.types";

export type TSupplierDto = {
	readonly id: string;
	readonly business_id: string;
	readonly name: string;
	readonly contact_person: string | null;
	readonly phone: string | null;
	readonly email: string | null;
	readonly address: string | null;
	readonly notes: string | null;
	readonly is_active: boolean;
	readonly created_at: string;
	readonly updated_at: string;
};

export const toSupplierDomain = (dto: TSupplierDto): TSupplier => ({
	id: dto.id as TSupplierId,
	tenantId: dto.business_id as TTenantId,
	name: dto.name,
	contactPerson: dto.contact_person,
	phone: dto.phone,
	email: dto.email,
	address: dto.address,
	notes: dto.notes,
	isActive: dto.is_active,
	createdAt: new Date(dto.created_at),
	updatedAt: new Date(dto.updated_at),
});
