import type { ICustomer } from "@/domain/customer/customer.types";
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
}

type CatalogResource = "products" | "customers" | "pets" | "staff";

export interface CatalogHandlers {
	readonly list: (
		resource: CatalogResource,
		request: Request,
		requestId: string,
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
	};
}

function unauthorized(requestId: string): Response {
	return jsonError(
		new ApiHttpError(401, "unauthorized", "Authentication required"),
		requestId,
	);
}
