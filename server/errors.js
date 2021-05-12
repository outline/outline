// @flow
import httpErrors from "http-errors";
import env from "./env";

export function AuthenticationError(
  message: string = "Invalid authentication",
  redirectUrl: string = env.URL
) {
  return httpErrors(401, message, {
    redirectUrl,
    id: "authentication_required",
  });
}

export function AuthorizationError(
  message: string = "You do not have permission to access this resource"
) {
  return httpErrors(403, message, { id: "permission_required" });
}

export function AdminRequiredError(
  message: string = "An admin role is required to access this resource"
) {
  return httpErrors(403, message, { id: "admin_required" });
}

export function UserSuspendedError({ adminEmail }: { adminEmail: string }) {
  return httpErrors(403, "Your access has been suspended by the team admin", {
    id: "user_suspended",
    errorData: {
      adminEmail,
    },
  });
}

export function InvalidRequestError(message: string = "Request invalid") {
  return httpErrors(400, message, { id: "invalid_request" });
}

export function NotFoundError(message: string = "Resource not found") {
  return httpErrors(404, message, { id: "not_found" });
}

export function ParamRequiredError(
  message: string = "Required parameter missing"
) {
  return httpErrors(400, message, { id: "param_required" });
}

export function ValidationError(message: string = "Validation failed") {
  return httpErrors(400, message, { id: "validation_error" });
}

export function EditorUpdateError(
  message: string = "The client editor is out of date and must be reloaded"
) {
  return httpErrors(400, message, { id: "editor_update_required" });
}

export function FileImportError(
  message: string = "The file could not be imported"
) {
  return httpErrors(400, message, { id: "import_error" });
}

export function OAuthStateMismatchError(
  message: string = "State returned in OAuth flow did not match"
) {
  return httpErrors(400, message, { id: "state_mismatch" });
}

export function MaximumTeamsError(
  message: string = "The maximum number of teams has been reached"
) {
  return httpErrors(400, message, { id: "maximum_teams" });
}

export function EmailAuthenticationRequiredError(
  message: string = "User must authenticate with email",
  redirectUrl: string = env.URL
) {
  return httpErrors(400, message, { redirectUrl, id: "email_auth_required" });
}

export function MicrosoftGraphError(
  message: string = "Microsoft Graph API did not return required fields"
) {
  return httpErrors(400, message, { id: "graph_error" });
}

export function GoogleWorkspaceRequiredError(
  message: string = "Google Workspace is required to authenticate"
) {
  return httpErrors(400, message, { id: "google_hd" });
}

export function GoogleWorkspaceInvalidError(
  message: string = "Google Workspace is invalid"
) {
  return httpErrors(400, message, { id: "hd_not_allowed" });
}

export function oauthWorkspaceRequiredError(
  message: string = "oauth Workspace is required to authenticate"
) {
  return httpErrors(400, message, { id: "oauth_hd" });
}

export function oauthWorkspaceInvalidError(
  message: string = "oauth Workspace is invalid"
) {
  return httpErrors(400, message, { id: "hd_not_allowed" });
}

export function AuthenticationProviderDisabledError(
  message: string = "Authentication method has been disabled by an admin",
  redirectUrl: string = env.URL
) {
  return httpErrors(400, message, {
    redirectUrl,
    id: "authentication_provider_disabled",
  });
}
