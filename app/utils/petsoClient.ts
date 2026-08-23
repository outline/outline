import { PetsoClient } from "@treonstudio/petso-lib";

/**
 * Resolves the backend API origin for the browser client.
 *
 * @returns the configured API origin or the current browser origin.
 */
export function getPetStoreApiBaseUrl(): string {
  const configured = window.env?.PET_STORE_API_URL;
  if (typeof configured === "string" && configured.trim()) {
    return configured.replace(/\/+$/, "");
  }
  return window.location.origin;
}

/** The direct browser client for the Pet Store REST API. */
export const petsoClient = new PetsoClient({
  baseUrl: getPetStoreApiBaseUrl(),
});
