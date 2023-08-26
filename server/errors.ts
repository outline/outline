import httpErrors from "http-errors";

export function InternalError(message = "Internal error") {
  return httpErrors(500, message, {
    id: "internal_error",
  });
}

export function AuthenticationError(
  message = "Authentication required",
  redirectUrl = "/"
) {
  return httpErrors(401, message, {
    redirectUrl,
    id: "authentication_required",
  });
}

export function InvalidAuthenticationError(
  message = "Invalid authentication",
  redirectUrl = "/"
) {
  return httpErrors(401, message, {
    redirectUrl,
    id: "invalid_authentication",
  });
}

export function AuthorizationError(
  message = "You do not have permission to access this resource"
) {
  return httpErrors(403, message, {
    id: "permission_required",
  });
}

export function RateLimitExceededError(
  message = "Rate limit exceeded for this operation"
) {
  return httpErrors(429, message, {
    id: "rate_limit_exceeded",
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

export function IncorrectEditionError(
  message = "Functionality not available in this edition"
) {
  return httpErrors(402, message, {
    id: "incorrect_edition",
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
  message = "The maximum number of workspaces has been reached"
) {
  return httpErrors(400, message, {
    id: "maximum_reached",
  });
}

export function TeamPendingDeletionError(
  message = "The workspace is pending deletion"
) {
  return httpErrors(403, message, {
    id: "pending_deletion",
  });
}

export function EmailAuthenticationRequiredError(
  message = "User must authenticate with email",
  redirectUrl = "/"
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

export function TeamDomainRequiredError(
  message = "Unable to determine workspace from current domain or subdomain"
) {
  return httpErrors(400, message, {
    id: "domain_required",
  });
}

export function GmailAccountCreationError(
  message = "Cannot create account using personal gmail address"
) {
  return httpErrors(400, message, {
    id: "gmail_account_creation",
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
  redirectUrl = "/"
) {
  return httpErrors(400, message, {
    redirectUrl,
    id: "authentication_provider_disabled",
  });
}
