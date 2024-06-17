import ApiKey from "@server/models/ApiKey";

export default function presentApiKey(key: ApiKey) {
  return {
    id: key.id,
    name: key.name,
    secret: key.secret,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
    expiryAt: key.expiryAt,
  };
}
