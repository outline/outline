/**
 * Shared utility functions for Excalidraw integration
 */

/**
 * Get the collaboration server URL based on the current environment
 */
export function getCollaborationServerUrl(): string {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  return "http://localhost:3000";
}

/**
 * Get user name or return default
 */
export function getUserName(user?: { name: string }): string {
  return user?.name || "Anonymous User";
}

/**
 * Get collaboration token from cookies
 */
export function getCollaborationToken(): string | undefined {
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') {
        return value;
      }
    }
  }
  return undefined;
}
