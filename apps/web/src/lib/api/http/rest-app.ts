import { getRequestId } from "./request-context";
import { jsonSuccess } from "./response";

/**
 * Handles REST routes that have been migrated to the direct Pet Store API.
 *
 * @param request the incoming HTTP request.
 * @returns a response for a migrated route, or undefined for the legacy route dispatcher.
 */
export async function handleRestRequest(
	request: Request,
): Promise<Response | undefined> {
	const url = new URL(request.url);
	if (url.pathname === "/api/v1/health" && request.method === "GET") {
		return jsonSuccess({ status: "ok" }, getRequestId(request));
	}

	return undefined;
}
