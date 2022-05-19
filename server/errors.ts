import httpErrors from "http-errors";
import env from "./env";

export function AuthenticationError(
  message = "Invalid authentication",
  redirectUrl = env.URL
) {
  return httpErrors(401, message, {
    redirectUrl,
    id: "authentication_required",
  });
}

export function AuthorizationError(
  message = "You do not have permission to access this resource"
) {
  return httpErrors(403, message, {
    id: "permission_required",
  });
}

export function InviteRequiredError(
  message = "You need an invite to join this team"
) {
  return httpErrors(403, message, {
    id: "invite_required",
  });
}

export function DomainNotAllowedError(
  message = "The domain is not allowed for this team"
) {
  return httpErrors(403, message, {
    id: "domain_not_allowed",
  });
}

export function AdminRequiredError(
  message = "An admin role is required to access this resource"
) {
  return httpErrors(403, message, {
    id: "admin_required",
  });
}

export function UserSuspendedError({
  adminEmail,
}: {
  adminEmail: string | undefined;
}) {
  return httpErrors(403, "Your access has been suspended by the team admin", {
    id: "user_suspended",
    errorData: {
      adminEmail,
    },
  });
}

export function InvalidRequestError(message = "Request invalid") {
  return httpErrors(400, message, {
    id: "invalid_request",
  });
}

export function NotFoundError(message = "Resource not found") {
  return httpErrors(404, message, {
    id: "not_found",
  });
}

export function ParamRequiredError(message = "Required parameter missing") {
  return httpErrors(400, message, {
    id: "param_required",
  });
}

export function ValidationError(message = "Validation failed") {
  return httpErrors(400, message, {
    id: "validation_error",
  });
}

export function EditorUpdateError(
  message = "The client editor is out of date and must be reloaded"
) {
  return httpErrors(400, message, {
    id: "editor_update_required",
  });
}

export function FileImportError(message = "The file could not be imported") {
  return httpErrors(400, message, {
    id: "import_error",
  });
}

export function OAuthStateMismatchError(
  message = "State returned in OAuth flow did not match"
) {
  return httpErrors(400, message, {
    id: "state_mismatch",
  });
}

export function MaximumTeamsError(
  message = "The maximum number of teams has been reached"
) {
  return httpErrors(400, message, {
    id: "maximum_teams",
  });
}

export function EmailAuthenticationRequiredError(
  message = "User must authenticate with email",
  redirectUrl = env.URL
) {
  return httpErrors(400, message, {
    redirectUrl,
    id: "email_auth_required",
  });
}

export function MicrosoftGraphError(
  message = "Microsoft Graph API did not return required fields"
) {
  return httpErrors(400, message, {
    id: "graph_error",
  });
}

export function GoogleWorkspaceRequiredError(
  message = "Google Workspace is required to authenticate"
) {
  return httpErrors(400, message, {
    id: "google_hd",
  });
}

export function OIDCMalformedUserInfoError(
  message = "User profile information malformed"
) {
  return httpErrors(400, message, {
    id: "malformed_user_info",
  });
}

export function AuthenticationProviderDisabledError(
  message = "Authentication method has been disabled by an admin",
  redirectUrl = env.URL
) {
  return httpErrors(400, message, {
    redirectUrl,
    id: "authentication_provider_disabled",
  });
}
