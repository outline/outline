import type { Request } from "koa";

/**
 * Helper class for reading values from incoming Koa requests.
 */
export class RequestHelper {
  /**
   * Get the parsed body of a request when it is a JSON object, form, or
   * multipart fields.
   *
   * @param request The incoming request.
   * @returns the body, or an empty object if the body is missing or is not an
   * object.
   */
  public static getBodyObject(request: Request): Record<string, unknown> {
    const { body } = request;
    return isRecord(body) ? body : {};
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
