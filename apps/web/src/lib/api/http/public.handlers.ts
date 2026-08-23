import { Schema } from "effect";
import type {
  TPublicBranch,
  TPublicBusiness,
  TPublicProduct,
  TPublicRoom,
} from "@/domain/public/public.types";
import type {
  CreatePortalBookingCommand,
  TPortalBooking,
} from "@/domain/portal";
import { CreatePortalBookingSchema } from "@/domain/portal/portal.schemas";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface PublicHandlerDependencies {
  readonly business: (slug: string) => Promise<TPublicBusiness | null>;
  readonly branches: (businessId: string) => Promise<readonly TPublicBranch[]>;
	readonly rooms: (
		businessId: string,
		targetDate?: Date,
	) => Promise<readonly TPublicRoom[]>;
  readonly featured: (businessId: string) => Promise<readonly TPublicProduct[]>;
  readonly product: (
    businessId: string,
    productId: string
  ) => Promise<TPublicProduct | null>;
  readonly createBooking: (
    input: CreatePortalBookingCommand,
    businessId: string
  ) => Promise<TPortalBooking>;
}

export interface PublicHandlers {
  readonly business: (
    request: Request,
    requestId: string,
    slug: string
  ) => Promise<Response>;
  readonly branches: (
    request: Request,
    requestId: string,
    slug: string
  ) => Promise<Response>;
  readonly rooms: (
    request: Request,
    requestId: string,
    slug: string
  ) => Promise<Response>;
  readonly featured: (
    request: Request,
    requestId: string,
    slug: string
  ) => Promise<Response>;
  readonly product: (
    request: Request,
    requestId: string,
    slug: string,
    productId: string
  ) => Promise<Response>;
  readonly booking: (
    request: Request,
    requestId: string,
    slug: string
  ) => Promise<Response>;
}

/** Creates unauthenticated REST handlers for the public Pet Store surface. */
export function createPublicHandlers(
  dependencies: PublicHandlerDependencies
): PublicHandlers {
  const findBusiness = (slug: string): Promise<TPublicBusiness | null> =>
    dependencies.business(slug);

  return {
    business: async (_request, requestId, slug) => {
      const business = await findBusiness(slug);
      return business
        ? jsonSuccess(business, requestId)
        : jsonError(
            new ApiHttpError(404, "not_found", "Business not found"),
            requestId
          );
    },
    branches: async (_request, requestId, slug) => {
      const business = await findBusiness(slug);
      if (!business) {
        return notFound(requestId);
      }
      return jsonSuccess(await dependencies.branches(business.id), requestId);
    },
    rooms: async (request, requestId, slug) => {
      const business = await findBusiness(slug);
      if (!business) {
        return notFound(requestId);
      }
		const dateParam = new URL(request.url).searchParams.get("date");
		const targetDate = dateParam ? new Date(dateParam) : undefined;
		if (dateParam && Number.isNaN(targetDate?.getTime())) {
			return validationError(requestId);
		}
		return jsonSuccess(
			await dependencies.rooms(business.id, targetDate),
			requestId,
		);
    },
    featured: async (_request, requestId, slug) => {
      const business = await findBusiness(slug);
      if (!business) {
        return notFound(requestId);
      }
      const products = await dependencies.featured(business.id);
      return jsonSuccess(
        products.filter((product) => product.isActive && product.stock > 0),
        requestId
      );
    },
    product: async (_request, requestId, slug, productId) => {
      const business = await findBusiness(slug);
      if (!business) {
        return notFound(requestId);
      }
      const product = await dependencies.product(business.id, productId);
      if (!product || !product.isActive || product.stock <= 0) {
        return jsonError(
          new ApiHttpError(404, "not_found", "Product not found"),
          requestId
        );
      }
      return jsonSuccess(product, requestId);
    },
    booking: async (request, requestId, slug) => {
      const business = await findBusiness(slug);
      if (!business) {
        return notFound(requestId);
      }
      const body = await readBody(request);
      if (!body) {
        return validationError(requestId);
      }
      try {
        const input = Schema.decodeUnknownSync(CreatePortalBookingSchema)({
          ...body,
          slug,
          scheduledAt: new Date(String(body.scheduledAt)),
        });
        const booking = await dependencies.createBooking(input, business.id);
        return jsonSuccess(
          { created: true, code: booking.id, booking },
          requestId,
          201
        );
      } catch (error) {
        if (error instanceof ApiHttpError) {
          return jsonError(error, requestId);
        }
        return validationError(requestId);
      }
    },
  };
}

async function readBody(
  request: Request
): Promise<Record<string, unknown> | undefined> {
  try {
    const value: unknown = await request.json();
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function validationError(requestId: string): Response {
  return jsonError(
    new ApiHttpError(422, "validation_error", "Booking data is invalid"),
    requestId
  );
}

function notFound(requestId: string): Response {
  return jsonError(
    new ApiHttpError(404, "not_found", "Business not found"),
    requestId
  );
}
