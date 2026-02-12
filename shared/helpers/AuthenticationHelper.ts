import { Scope } from "../types";

export default class AuthenticationHelper {
  /**
   * The mapping of method names to their scopes, anything not listed here
   * defaults to `Scope.Write`.
   *
   * - `documents.create` -> `Scope.Create`
   * - `documents.list` -> `Scope.Read`
   * - `documents.info` -> `Scope.Read`
   */
  private static methodToScope = {
    create: Scope.Create,
    config: Scope.Read,
    list: Scope.Read,
    info: Scope.Read,
    search: Scope.Read,
    documents: Scope.Read,
    drafts: Scope.Read,
    viewed: Scope.Read,
    export: Scope.Read,
  };

  /**
   * Returns whether the given path can be accessed with any of the scopes. We
   * support scopes in the formats of:
   *
   * - `/api/namespace.method`
   * - `namespace:scope`
   * - `scope`
   *
   * @param path The path to check
   * @param scopes The scopes to check
   * @returns True if the path can be accessed
   */
  public static canAccess = (path: string, scopes: string[]) => {
    // strip any query string, this is never used as part of scope matching
    path = path.split("?")[0];

    const resource = path.split("/").pop() ?? "";
    const [namespace, method] = resource.split(".");

    return scopes.some((scope) => {
      const [scopeNamespace, scopeMethod] = scope.match(/[:\.]/g)
        ? scope.replace("/api/", "").split(/[:\.]/g)
        : ["*", scope];
      const isRouteScope = scope.startsWith("/api/");

      if (isRouteScope) {
        return (
          (namespace === scopeNamespace || scopeNamespace === "*") &&
          (method === scopeMethod || scopeMethod === "*")
        );
      }

      return (
        (namespace === scopeNamespace || scopeNamespace === "*") &&
        (scopeMethod === Scope.Write ||
          this.methodToScope[method as keyof typeof this.methodToScope] ===
            scopeMethod)
      );
    });
  };
}
