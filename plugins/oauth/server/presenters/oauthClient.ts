import OAuthClient from "../models/OAuthClient";

export default function presentOAuthClient(apiKey: OAuthClient) {
  return {
    id: apiKey.id,
    name: apiKey.name,
    description: apiKey.description,
    developerName: apiKey.developerName,
    developerUrl: apiKey.developerUrl,
    avatarUrl: apiKey.avatarUrl,
    clientId: apiKey.clientId,
    clientSecret: apiKey.clientSecret,
    redirectUris: apiKey.redirectUris,
    published: apiKey.published,
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
  };
}
