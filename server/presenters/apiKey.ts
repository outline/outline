import type ApiKey from "@server/models/ApiKey";
import presentUser from "./user";

export default function presentApiKey(apiKey: ApiKey) {
  return {
    id: apiKey.id,
    user: presentUser(apiKey.user),
    userId: apiKey.userId,
    name: apiKey.name,
    scope: apiKey.scope,
    value: apiKey.value,
    last4: apiKey.last4,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
    expiresAt: apiKey.expiresAt,
    lastActiveAt: apiKey.lastActiveAt,
  };
}
