import httpErrors from "http-errors";

export function InternalError(message = "Internal error") {
  return httpErrors(500, message, {
    id: "internal_error",
    isReportable: true,
  });
}

export function AuthenticationError(
  message = "Authentication required",
  redirectPath = "/"
) {
  return httpErrors(401, message, {
    redirectPath,
    id: "authentication_required",
    isReportable: false,
  });
}

export function InvalidAuthenticationError(
  message = "Invalid authentication",
  redirectPath = "/"
) {
  return httpErrors(401, message, {
    redirectPath,
    id: "invalid_authentication",
    isReportable: false,
  });
}

export function AuthorizationError(message = "Authorization error") {
  return httpErrors(403, message, {
    id: "authorization_error",
    isReportable: false,
  });
}

export function CSRFError(message = "Authorization error") {
  return httpErrors(403, message, {
    id: "csrf_error",
    isReportable: false,
  });
}

export function RateLimitExceededError(
  message = "Rate limit exceeded for this operation"
) {
  return httpErrors(429, message, {
    id: "rate_limit_exceeded",
    isReportable: false,
  });
}

export function InviteRequiredError(
  message = "You need an invite to join this team"
) {
  return httpErrors(403, message, {
    id: "invite_required",
    isReportable: false,
  });
}

export function DomainNotAllowedError(
  message = "The domain is not allowed for this workspace"
) {
  return httpErrors(403, message, {
    id: "domain_not_allowed",
    isReportable: false,
  });
}

export function AdminRequiredError(
  message = "An admin role is required to access this resource"
) {
  return httpErrors(403, message, {
    id: "admin_required",
    isReportable: false,
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
      isReportable: false,
    }
  );
}

export function InvalidRequestError(message = "Request invalid") {
  return httpErrors(400, message, {
    id: "invalid_request",
    isReportable: false,
  });
}

export function PaymentRequiredError(message = "Payment required") {
  return httpErrors(402, message, {
    id: "payment_required",
    isReportable: false,
  });
}

export function NotFoundError(message = "Resource not found") {
  return httpErrors(404, message, {
    id: "not_found",
    isReportable: false,
  });
}

export function ParamRequiredError(message = "Required parameter missing") {
  return httpErrors(400, message, {
    id: "param_required",
    isReportable: false,
  });
}

export function ValidationError(message = "Validation failed") {
  return httpErrors(400, message, {
    id: "validation_error",
    isReportable: false,
  });
}

export function IncorrectEditionError(
  message = "Functionality not available in this edition"
) {
  return httpErrors(402, message, {
    id: "incorrect_edition",
    isReportable: false,
  });
}

export function EditorUpdateError(
  message = "The client editor is out of date and must be reloaded"
) {
  return httpErrors(400, message, {
    id: "editor_update_required",
    isReportable: false,
  });
}

export function FileImportError(message = "The file could not be imported") {
  return httpErrors(400, message, {
    id: "import_error",
    isReportable: false,
  });
}

export function OAuthStateMismatchError(
  message = "State returned in OAuth flow did not match"
) {
  return httpErrors(400, message, {
    id: "state_mismatch",
    isReportable: false,
  });
}

export function TeamPendingDeletionError(
  message = "The workspace is pending deletion"
) {
  return httpErrors(403, message, {
    id: "pending_deletion",
    isReportable: false,
  });
}

export function EmailAuthenticationRequiredError(
  message = "User must authenticate with email",
  redirectPath = "/"
) {
  return httpErrors(400, message, {
    redirectPath,
    id: "email_auth_required",
    isReportable: false,
  });
}

export function MicrosoftGraphError(
  message = "Microsoft Graph API did not return required fields"
) {
  return httpErrors(400, message, {
    id: "graph_error",
    isReportable: false,
  });
}

export function TeamDomainRequiredError(
  message = "Unable to determine workspace from current domain or subdomain"
) {
  return httpErrors(400, message, {
    id: "domain_required",
    isReportable: false,
  });
}

export function GmailAccountCreationError(
  message = "Cannot create account using personal gmail address"
) {
  return httpErrors(400, message, {
    id: "gmail_account_creation",
    isReportable: false,
  });
}

export function OIDCMalformedUserInfoError(
  message = "User profile information malformed"
) {
  return httpErrors(400, message, {
    id: "malformed_user_info",
    isReportable: false,
  });
}

export function AuthenticationProviderDisabledError(
  message = "Authentication method has been disabled by an admin",
  redirectPath = "/"
) {
  return httpErrors(400, message, {
    redirectPath,
    id: "authentication_provider_disabled",
    isReportable: false,
  });
}

export function UnprocessableEntityError(
  message = "Cannot process the request"
) {
  return httpErrors(422, message, {
    id: "unprocessable_entity",
    isReportable: false,
  });
}

export function ClientClosedRequestError(
  message = "Client closed request before response was received"
) {
  return httpErrors(499, message, {
    id: "client_closed_request",
    isReportable: false,
  });
}
