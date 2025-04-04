import { t } from "i18next";
import capitalize from "lodash/capitalize";
import uniq from "lodash/uniq";

export class OAuthHelper {
  public static normalizeScopes(scopes: string[]): string[] {
    const methodToReadable = {
      list: t("read"),
      info: t("read"),
      read: t("read"),
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
