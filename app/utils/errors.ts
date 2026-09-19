import ExtendableError from "es6-error";

// Note: `name` is assigned explicitly on each error rather than inherited from
// the constructor name, which is mangled by the production build and would
// otherwise be reported as a single letter.

/** Error thrown when the user is not authorized to perform a request. */
export class AuthorizationError extends ExtendableError {
  name = "AuthorizationError";
}

/** Error thrown when the server could not understand the request. */
export class BadRequestError extends ExtendableError {
  name = "BadRequestError";
}

/** Error thrown when a network-level failure prevents a request. */
export class NetworkError extends ExtendableError {
  name = "NetworkError";
}

/** Error thrown when the requested resource could not be found. */
export class NotFoundError extends ExtendableError {
  name = "NotFoundError";
}

/** Error thrown when the request requires payment or an upgraded plan. */
export class PaymentRequiredError extends ExtendableError {
  name = "PaymentRequiredError";
}

/** Error thrown when a request is made while the client is offline. */
export class OfflineError extends ExtendableError {
  name = "OfflineError";
}

/** Error thrown when the service is temporarily unavailable. */
export class ServiceUnavailableError extends ExtendableError {
  name = "ServiceUnavailableError";
}

/** Error thrown when an upstream server returned an invalid response. */
export class BadGatewayError extends ExtendableError {
  name = "BadGatewayError";
}

/** Error thrown when the request was well-formed but could not be processed. */
export class UnprocessableEntityError extends ExtendableError {
  name = "UnprocessableEntityError";
}

/** Error thrown when the client has exceeded the allowed request rate. */
export class RateLimitExceededError extends ExtendableError {
  name = "RateLimitExceededError";
}

/** Error thrown when the client closed the connection before a response. */
export class ClientClosedRequestError extends ExtendableError {
  name = "ClientClosedRequestError";
}

/** Error thrown when a request fails for a generic reason. */
export class RequestError extends ExtendableError {
  name = "RequestError";
}

/** Error thrown when the client version is too old to use the API. */
export class UpdateRequiredError extends ExtendableError {
  name = "UpdateRequiredError";
}
