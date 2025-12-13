/**
 * The server is terminating the connection because a data frame was received
 * that is too large.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
export const DocumentTooLarge = {
  code: 1009,
  reason: "Document Too Large",
};

/**
 * Similar to AuthorizationFailed, but specifically for use when authentication is required and has
 * failed or has not yet been provided.
 */
export const AuthenticationFailed = {
  code: 4401,
  reason: "Authentication Failed",
};

/**
 * The request contained valid data and was understood by the server, but the server
 * is refusing action.
 */
export const AuthorizationFailed = {
  code: 4403,
  reason: "Authorization Failed",
};

/**
 * The server is refusing to process the request because there are too many connections
 * to the given document.
 */
export const TooManyConnections = {
  code: 4503,
  reason: "Too Many Connections",
};

/**
 * The client must update their editor to continue collaborating.
 */
export const EditorUpdateError = {
  code: 4999,
  reason: "Editor Update Required",
};

/**
 * The server timed out waiting for the request.
 */
export const ConnectionTimeout = {
  code: 4408,
  reason: "Connection Timeout",
};
