import type { TBranchDto } from "@/domain/branch/branch.dto";
import { readSessionToken } from "@/infra/auth/http-session-cookie";
import { ApiHttpError, jsonError, jsonSuccess } from "./response";

interface BranchSession {
  readonly user: { readonly id: string };
  readonly business: { readonly id: string };
}

interface BranchHandlerDependencies {
  readonly session: (token: string) => Promise<BranchSession | null>;
  readonly list: (businessId: string) => Promise<readonly TBranchDto[]>;
}

export interface BranchHandlers {
  readonly list: (request: Request, requestId: string) => Promise<Response>;
}

/**
 * Creates REST handlers for branch resources.
 *
 * @param dependencies authenticated session and branch domain operations.
 * @returns branch REST handlers.
 */
export function createBranchHandlers(
  dependencies: BranchHandlerDependencies
): BranchHandlers {
  return {
    list: async (request, requestId) => {
      const token = readSessionToken(request);
      if (!token) {
        return jsonError(
          new ApiHttpError(401, "unauthorized", "Authentication required"),
          requestId
        );
      }

      const session = await dependencies.session(token);
      if (!session) {
        return jsonError(
          new ApiHttpError(401, "unauthorized", "Authentication required"),
          requestId
        );
      }

      return jsonSuccess(
        await dependencies.list(session.business.id),
        requestId
      );
    },
  };
}
