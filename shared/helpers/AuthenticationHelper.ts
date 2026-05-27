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
   * Matches exactly one of the supported scope grammars:
   *
   * - `*` — full wildcard
   * - `read` | `write` | `create` — global access scope
   * - `<namespace>:(read|write|create)` — namespaced access scope
   * - `/api/<namespace>.<method>` — route scope, namespace and method may be `*`
   */
  public static scopeGrammarRegex =
    /^(\*|read|write|create|\w+:(read|write|create)|\/api\/(\*|\w+)\.(\*|\w+))$/;

  /**
   * Returns whether the given string is a well-formed scope. Scopes that mix
   * route and namespaced forms (e.g. `/api/documents.list:read`) are rejected
   * to avoid ambiguity between validation and enforcement.
   *
   * @param scope The scope to validate
   * @param options.allowRootWildcard Whether scopes that grant access to every
   *   route (`*` and `/api/*.*`) should be considered valid. Defaults to true.
   * @returns true if the scope conforms to the supported grammar
   */
  public static isValidScope = (
    scope: string,
    options: { allowRootWildcard?: boolean } = {}
  ): boolean => {
    const { allowRootWildcard = true } = options;
    if (!AuthenticationHelper.scopeGrammarRegex.test(scope)) {
      return false;
    }
    if (!allowRootWildcard && (scope === "*" || scope === "/api/*.*")) {
      return false;
    }
    return true;
  };

  /**
   * Returns whether the given path can be accessed with any of the scopes. We
   * support scopes in the formats of:
   *
   * - `/api/namespace.method`
   * - `namespace:scope`
   * - `scope`
   *
   * Malformed scopes that do not match the supported grammar are ignored.
   *
   * @param path The path to check
   * @param scopes The scopes to check
   * @returns True if the path can be accessed
   */
  public static canAccess = (path: string, scopes: string[]) => {
    // A wildcard scope grants full access (e.g. API key with no restrictions)
    if (scopes.includes("*")) {
      return true;
    }

    // strip any query string or fragment, these are never used as part of scope matching
    path = path.split("?")[0].split("#")[0];

    const resource = path.split("/").pop() ?? "";
    const [namespace, method] = resource.split(".");

    return scopes.some((scope) => {
      if (!AuthenticationHelper.isValidScope(scope)) {
        return false;
      }

      const [scopeNamespace, scopeMethod] = scope.match(/[:.]/g)
        ? scope.replace("/api/", "").split(/[:.]/g)
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
