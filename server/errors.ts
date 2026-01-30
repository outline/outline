import httpErrors from "http-errors";

export function InternalError(message = "Internal error") {
  return httpErrors(500, message, {
    id: "internal_error",
    isSentryReported: true,
  });
}

export function AuthenticationError(
  message = "Authentication required",
  redirectPath = "/"
) {
  return httpErrors(401, message, {
    redirectPath,
    id: "authentication_required",
    isSentryReported: false,
  });
}

export function InvalidAuthenticationError(
  message = "Invalid authentication",
  redirectPath = "/"
) {
  return httpErrors(401, message, {
    redirectPath,
    id: "invalid_authentication",
    isSentryReported: false,
  });
}

export function AuthorizationError(message = "Authorization error") {
  return httpErrors(403, message, {
    id: "authorization_error",
    isSentryReported: false,
  });
}

export function CSRFError(message = "Authorization error") {
  return httpErrors(403, message, {
    id: "csrf_error",
    isSentryReported: false,
  });
}

export function RateLimitExceededError(
  message = "Rate limit exceeded for this operation"
) {
  return httpErrors(429, message, {
    id: "rate_limit_exceeded",
    isSentryReported: false,
  });
}

export function InviteRequiredError(
  message = "You need an invite to join this team"
) {
  return httpErrors(403, message, {
    id: "invite_required",
    isSentryReported: false,
  });
}

export function DomainNotAllowedError(
  message = "The domain is not allowed for this workspace"
) {
  return httpErrors(403, message, {
    id: "domain_not_allowed",
    isSentryReported: false,
  });
}

export function AdminRequiredError(
  message = "An admin role is required to access this resource"
) {
  return httpErrors(403, message, {
    id: "admin_required",
    isSentryReported: false,
  });
}

export function UserSuspendedError({
  adminEmail,
}: {
  adminEmail: string | undefined;
}) {
  return httpErrors(
    403,
    "Your access has been suspended by a workspace admin",
    {
      id: "user_suspended",
      errorData: {
        adminEmail,
      },
      isSentryReported: false,
    }
  );
}

export function InvalidRequestError(message = "Request invalid") {
  return httpErrors(400, message, {
    id: "invalid_request",
    isSentryReported: false,
  });
}

export function PaymentRequiredError(message = "Payment required") {
  return httpErrors(402, message, {
    id: "payment_required",
    isSentryReported: false,
  });
}

export function NotFoundError(message = "Resource not found") {
  return httpErrors(404, message, {
    id: "not_found",
    isSentryReported: false,
  });
}

export function ParamRequiredError(message = "Required parameter missing") {
  return httpErrors(400, message, {
    id: "param_required",
    isSentryReported: false,
  });
}

export function ValidationError(message = "Validation failed") {
  return httpErrors(400, message, {
    id: "validation_error",
    isSentryReported: false,
  });
}

export function IncorrectEditionError(
  message = "Functionality not available in this edition"
) {
  return httpErrors(402, message, {
    id: "incorrect_edition",
    isSentryReported: false,
  });
}

export function EditorUpdateError(
  message = "The client editor is out of date and must be reloaded"
) {
  return httpErrors(400, message, {
    id: "editor_update_required",
    isSentryReported: false,
  });
}

export function FileImportError(message = "The file could not be imported") {
  return httpErrors(400, message, {
    id: "import_error",
    isSentryReported: false,
  });
}

export function OAuthStateMismatchError(
  message = "State returned in OAuth flow did not match"
) {
  return httpErrors(400, message, {
    id: "state_mismatch",
    isSentryReported: false,
  });
}

export function TeamPendingDeletionError(
  message = "The workspace is pending deletion"
) {
  return httpErrors(403, message, {
    id: "pending_deletion",
    isSentryReported: false,
  });
}

export function EmailAuthenticationRequiredError(
  message = "User must authenticate with email",
  redirectPath = "/"
) {
  return httpErrors(400, message, {
    redirectPath,
    id: "email_auth_required",
    isSentryReported: false,
  });
}

export function MicrosoftGraphError(
  message = "Microsoft Graph API did not return required fields"
) {
  return httpErrors(400, message, {
    id: "graph_error",
    isSentryReported: false,
  });
}

export function TeamDomainRequiredError(
  message = "Unable to determine workspace from current domain or subdomain"
) {
  return httpErrors(400, message, {
    id: "domain_required",
    isSentryReported: false,
  });
}

export function GmailAccountCreationError(
  message = "Cannot create account using personal gmail address"
) {
  return httpErrors(400, message, {
    id: "gmail_account_creation",
    isSentryReported: false,
  });
}

export function OIDCMalformedUserInfoError(
  message = "User profile information malformed"
) {
  return httpErrors(400, message, {
    id: "malformed_user_info",
    isSentryReported: false,
  });
}

export function AuthenticationProviderDisabledError(
  message = "Authentication method has been disabled by an admin",
  redirectPath = "/"
) {
  return httpErrors(400, message, {
    redirectPath,
    id: "authentication_provider_disabled",
    isSentryReported: false,
  });
}

export function UnprocessableEntityError(
  message = "Cannot process the request"
) {
  return httpErrors(422, message, {
    id: "unprocessable_entity",
    isSentryReported: false,
  });
}

export function ClientClosedRequestError(
  message = "Client closed request before response was received"
) {
  return httpErrors(499, message, {
    id: "client_closed_request",
    isSentryReported: false,
  });
}
