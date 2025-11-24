import crypto from "crypto";
import { URL } from "url";

/**
 * Generates a consistent hash from an avatar URL for use in filename generation.
 * This allows us to detect when an avatar has changed by comparing filenames.
 *
 * @param avatarUrl The original avatar URL from the identity provider
 * @returns A SHA-256 hash of the normalized URL
 */
export function generateAvatarHash(avatarUrl: string): string {
  try {
    // Normalize the URL to ensure consistent hashing
    const url = new URL(avatarUrl);
    const normalizedUrl = `${url.protocol}//${url.host}${url.pathname}${url.search}`;

    return crypto
      .createHash("sha256")
      .update(normalizedUrl)
      .digest("hex")
      .substring(0, 16); // Use first 16 characters for shorter filenames
  } catch (_error) {
    // If URL parsing fails, fall back to hashing the original string
    return crypto
      .createHash("sha256")
      .update(avatarUrl)
      .digest("hex")
      .substring(0, 16);
  }
}

/**
 * Generates a consistent filename for storing an avatar based on its source URL.
 *
 * @param userId The user ID
 * @param avatarUrl The original avatar URL from the identity provider
 * @returns A consistent filename for the avatar
 */
export function generateAvatarFilename(
  userId: string,
  avatarUrl: string
): string {
  const hash = generateAvatarHash(avatarUrl);
  return `${userId}/${hash}`;
}

/**
 * Extracts the avatar hash from a stored avatar URL to compare with source URLs.
 *
 * @param storedAvatarUrl The URL of the avatar stored in our system
 * @returns The hash portion of the filename, or null if not found
 */
export function extractAvatarHashFromUrl(
  storedAvatarUrl: string
): string | null {
  try {
    const url = new URL(storedAvatarUrl);
    const pathParts = url.pathname.split("/");
    // Assuming the filename is the last part of the path
    const filename = pathParts[pathParts.length - 1];

    // If the filename looks like a hash (16 hex characters), return it
    if (/^[a-f0-9]{16}$/.test(filename)) {
      return filename;
    }

    return null;
  } catch (_error) {
    return null;
  }
}

/**
 * Checks if an avatar needs to be updated by comparing the source URL hash
 * with the hash of the currently stored avatar.
 *
 * @param currentAvatarUrl The currently stored avatar URL
 * @param sourceAvatarUrl The source avatar URL from the identity provider
 * @returns True if the avatar needs to be updated
 */
export function shouldUpdateAvatar(
  currentAvatarUrl: string | null,
  sourceAvatarUrl: string
): boolean {
  if (!currentAvatarUrl) {
    return true; // No current avatar, should update
  }

  const currentHash = extractAvatarHashFromUrl(currentAvatarUrl);
  const sourceHash = generateAvatarHash(sourceAvatarUrl);

  return currentHash !== sourceHash;
}
