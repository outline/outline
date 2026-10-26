import httpErrors from "http-errors";

export function MicrosoftGraphError(
  message = "Microsoft Graph API did not return required fields"
) {
  return httpErrors(400, message, {
    id: "graph_error",
    isReportable: false,
  });
}
