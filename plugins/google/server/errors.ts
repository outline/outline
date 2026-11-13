import httpErrors from "http-errors";

export function GmailAccountCreationError(
  message = "Cannot create account using personal Gmail address"
) {
  return httpErrors(400, message, {
    id: "gmail_account_creation",
    isReportable: false,
  });
}
