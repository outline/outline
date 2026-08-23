const REQUEST_ID_HEADER = "X-Request-Id";
const BRANCH_ID_HEADER = "X-Branch-Id";

/**
 * Returns the request correlation id, generating one when absent.
 *
 * @param request the incoming HTTP request.
 * @returns the stable request correlation id.
 */
export function getRequestId(request: Request): string {
	return request.headers.get(REQUEST_ID_HEADER)?.trim() || crypto.randomUUID();
}

/**
 * Returns the requested active branch, if supplied by the frontend.
 *
 * @param request the incoming HTTP request.
 * @returns the branch id or undefined when the request is not branch scoped.
 */
export function getBranchId(request: Request): string | undefined {
	const branchId = request.headers.get(BRANCH_ID_HEADER)?.trim();
	return branchId || undefined;
}
