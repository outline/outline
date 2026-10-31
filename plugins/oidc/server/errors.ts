import httpErrors from "http-errors";

export function OIDCMalformedUserInfoError(
  message = "User profile information malformed"
) {
  return httpErrors(400, message, {
    id: "malformed_user_info",
    isReportable: false,
  });
}
