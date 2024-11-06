import ApiKey from "@server/models/ApiKey";

export default function presentApiKey(apiKey: ApiKey) {
  return {
    id: apiKey.id,
    userId: apiKey.userId,
    name: apiKey.name,
    value: apiKey.value,
    last4: apiKey.last4,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
    expiresAt: apiKey.expiresAt,
    lastActiveAt: apiKey.lastActiveAt,
  };
}
