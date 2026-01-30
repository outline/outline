import * as errors from "./errors";

describe("errors", () => {
  describe("InternalError", () => {
    it("should be marked for Sentry reporting", () => {
      const error = errors.InternalError();
      expect(error.isReportable).toBe(true);
    });

    it("should have status 500", () => {
      const error = errors.InternalError();
      expect(error.status).toBe(500);
    });
  });

  describe("User input errors", () => {
    const userInputErrors = [
      { name: "AuthenticationError", fn: errors.AuthenticationError },
      { name: "InvalidAuthenticationError", fn: errors.InvalidAuthenticationError },
      { name: "AuthorizationError", fn: errors.AuthorizationError },
      { name: "CSRFError", fn: errors.CSRFError },
      { name: "RateLimitExceededError", fn: errors.RateLimitExceededError },
      { name: "InviteRequiredError", fn: errors.InviteRequiredError },
      { name: "DomainNotAllowedError", fn: errors.DomainNotAllowedError },
      { name: "AdminRequiredError", fn: errors.AdminRequiredError },
      { name: "InvalidRequestError", fn: errors.InvalidRequestError },
      { name: "PaymentRequiredError", fn: errors.PaymentRequiredError },
      { name: "NotFoundError", fn: errors.NotFoundError },
      { name: "ParamRequiredError", fn: errors.ParamRequiredError },
      { name: "ValidationError", fn: errors.ValidationError },
      { name: "IncorrectEditionError", fn: errors.IncorrectEditionError },
      { name: "EditorUpdateError", fn: errors.EditorUpdateError },
      { name: "FileImportError", fn: errors.FileImportError },
      { name: "OAuthStateMismatchError", fn: errors.OAuthStateMismatchError },
      { name: "TeamPendingDeletionError", fn: errors.TeamPendingDeletionError },
      { name: "EmailAuthenticationRequiredError", fn: errors.EmailAuthenticationRequiredError },
      { name: "MicrosoftGraphError", fn: errors.MicrosoftGraphError },
      { name: "TeamDomainRequiredError", fn: errors.TeamDomainRequiredError },
      { name: "GmailAccountCreationError", fn: errors.GmailAccountCreationError },
      { name: "OIDCMalformedUserInfoError", fn: errors.OIDCMalformedUserInfoError },
      { name: "AuthenticationProviderDisabledError", fn: errors.AuthenticationProviderDisabledError },
      { name: "UnprocessableEntityError", fn: errors.UnprocessableEntityError },
      { name: "ClientClosedRequestError", fn: errors.ClientClosedRequestError },
    ];

    userInputErrors.forEach(({ name, fn }) => {
      it(`${name} should not be marked for Sentry reporting`, () => {
        const error = fn();
        expect(error.isReportable).toBe(false);
      });
    });
  });

  describe("UserSuspendedError", () => {
    it("should not be marked for Sentry reporting", () => {
      const error = errors.UserSuspendedError({ adminEmail: "test@example.com" });
      expect(error.isReportable).toBe(false);
    });
  });
});
