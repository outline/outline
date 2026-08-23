import type {
	ICreateCustomerCommand,
	ICustomer,
	IUpdateCustomerCommand,
	TCustomerId,
} from "@/domain/customer/customer.types";
import type { TPet } from "@/domain/pet/pet.types";
import type { TProductDto } from "@/domain/product/product.dto";
import type { TStaffMemberDto } from "@/domain/staff/staff.dto";
import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface CatalogSession {
	readonly business: { readonly id: string };
}

interface CatalogHandlerDependencies {
	readonly session: (token: string) => Promise<CatalogSession | null>;
	readonly products: (businessId: string) => Promise<readonly TProductDto[]>;
	readonly customers: (businessId: string) => Promise<readonly ICustomer[]>;
	readonly pets: (businessId: string) => Promise<readonly TPet[]>;
	readonly staff: (businessId: string) => Promise<readonly TStaffMemberDto[]>;
	readonly createCustomer: (
		businessId: string,
		input: ICreateCustomerCommand,
	) => Promise<ICustomer>;
	readonly updateCustomer: (
		businessId: string,
		input: IUpdateCustomerCommand,
	) => Promise<ICustomer>;
	readonly deleteCustomer: (businessId: string, id: string) => Promise<void>;
	readonly createPet: (businessId: string, input: unknown) => Promise<TPet>;
	readonly updatePet: (businessId: string, input: unknown) => Promise<TPet>;
	readonly deletePet: (businessId: string, id: string) => Promise<void>;
}

type CatalogResource = "products" | "customers" | "pets" | "staff";

export interface CatalogHandlers {
	readonly list: (
		resource: CatalogResource,
		request: Request,
		requestId: string,
	) => Promise<Response>;
	readonly mutateCustomer: (
		request: Request,
		requestId: string,
		id?: string,
	) => Promise<Response>;
	readonly mutatePet: (
		request: Request,
		requestId: string,
		id?: string,
	) => Promise<Response>;
}

/**
 * Creates authenticated REST handlers for the core catalog resources.
 *
 * @param dependencies session and domain list operations.
 * @returns catalog REST handlers.
 */
export function createCatalogHandlers(
	dependencies: CatalogHandlerDependencies,
): CatalogHandlers {
	return {
		list: async (resource, request, requestId) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);

			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);

			const businessId = session.business.id;
			const data =
				resource === "products"
					? await dependencies.products(businessId)
					: resource === "customers"
						? await dependencies.customers(businessId)
						: resource === "pets"
							? await dependencies.pets(businessId)
							: await dependencies.staff(businessId);
			return jsonSuccess(data, requestId);
		},
		mutateCustomer: async (request, requestId, id) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);

			if (request.method === "DELETE" && id) {
				await dependencies.deleteCustomer(session.business.id, id);
				return jsonSuccess({ deleted: true }, requestId);
			}

			const body = await readBody(request);
			const input = parseCustomerInput(body);
			if (!input) {
				return jsonError(
					new ApiHttpError(
						422,
						"validation_error",
						"Customer name and phone are required",
					),
					requestId,
				);
			}

			const customer = id
				? await dependencies.updateCustomer(session.business.id, {
						...input,
						id: id as TCustomerId,
					})
				: await dependencies.createCustomer(session.business.id, input);
			return jsonSuccess(customer, requestId, id ? 200 : 201);
		},
		mutatePet: async (request, requestId, id) => {
			const token = readSessionToken(request);
			if (!token) return unauthorized(requestId);
			const session = await dependencies.session(token);
			if (!session) return unauthorized(requestId);

			if (request.method === "DELETE" && id) {
				await dependencies.deletePet(session.business.id, id);
				return jsonSuccess({ deleted: true }, requestId);
			}

			const body = await readBody(request);
			if (!body) {
				return jsonError(
					new ApiHttpError(422, "validation_error", "Pet data is required"),
					requestId,
				);
			}
			const input = id
				? { ...normalizePetBody(body), id }
				: normalizePetBody(body);
			const pet = id
				? await dependencies.updatePet(session.business.id, input)
				: await dependencies.createPet(session.business.id, input);
			return jsonSuccess(pet, requestId, id ? 200 : 201);
		},
	};
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}

async function readBody(
	request: Request,
): Promise<Record<string, unknown> | undefined> {
	try {
		const value: unknown = await request.json();
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return undefined;
		}
		return isRecord(value) ? value : undefined;
	} catch {
		return undefined;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePetBody(
	body: Record<string, unknown>,
): Record<string, unknown> {
	const birthDate = body.birthDate;
	if (typeof birthDate !== "string") return body;
	return { ...body, birthDate: new Date(birthDate) };
}

function parseCustomerInput(
	body: Record<string, unknown> | undefined,
): ICreateCustomerCommand | undefined {
	if (!body || typeof body.fullName !== "string" || !body.fullName.trim()) {
		return undefined;
	}
	if (typeof body.phone !== "string" || !body.phone.trim()) return undefined;
	const optionalString = (value: unknown): string | null | undefined => {
		if (value === undefined || value === null) return value;
		return typeof value === "string" ? value : undefined;
	};
	const email = optionalString(body.email);
	const address = optionalString(body.address);
	const notes = optionalString(body.notes);
	return {
		fullName: body.fullName.trim(),
		phone: body.phone.trim(),
		...(email !== undefined ? { email } : {}),
		...(address !== undefined ? { address } : {}),
		...(notes !== undefined ? { notes } : {}),
	};
}
