import { t } from "i18next";
import capitalize from "lodash/capitalize";
import uniq from "lodash/uniq";
import { Scope } from "@shared/types";

export class OAuthScopeHelper {
  public static normalizeScopes(scopes: string[]): string[] {
    const methodToReadable = {
      list: t("view"),
      info: t("view"),
      read: t("view"),
      write: t("write"),
      create: t("write"),
      update: t("write"),
      delete: t("write"),
      "*": t("manage"),
    };

    const translatedNamespaces = {
      apiKeys: t("API keys"),
      attachments: t("attachments"),
      collections: t("collections"),
      comments: t("comments"),
      documents: t("documents"),
      events: t("events"),
      groups: t("groups"),
      integrations: t("integrations"),
      notifications: t("notifications"),
      reactions: t("reactions"),
      pins: t("pins"),
      shares: t("shares"),
      users: t("users"),
      teams: t("teams"),
      "*": t("workspace"),
    };

    const normalizedScopes = scopes.map((scope) => {
      if (scope === Scope.Read) {
        return t("View workspace");
      }
      if (scope === Scope.Write) {
        return t("View workspace");
      }

      const [namespace, method] = scope.replace("/api/", "").split(/[:\.]/g);
      const readableMethod =
        methodToReadable[method as keyof typeof methodToReadable] ?? method;
      const translatedNamespace =
        translatedNamespaces[namespace as keyof typeof translatedNamespaces] ??
        namespace;
      return capitalize(`${readableMethod} ${translatedNamespace}`);
    });

    return uniq(normalizedScopes);
  }
}
