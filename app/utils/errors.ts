import ExtendableError from "es6-error";

/** Error thrown when the user is not authorized to perform a request. */
export class AuthorizationError extends ExtendableError {}

/** Error thrown when the server could not understand the request. */
export class BadRequestError extends ExtendableError {}

/** Error thrown when a network-level failure prevents a request. */
export class NetworkError extends ExtendableError {}

/** Error thrown when the requested resource could not be found. */
export class NotFoundError extends ExtendableError {}

/** Error thrown when the request requires payment or an upgraded plan. */
export class PaymentRequiredError extends ExtendableError {}

/** Error thrown when a request is made while the client is offline. */
export class OfflineError extends ExtendableError {}

/** Error thrown when the service is temporarily unavailable. */
export class ServiceUnavailableError extends ExtendableError {}

/** Error thrown when an upstream server returned an invalid response. */
export class BadGatewayError extends ExtendableError {}

/** Error thrown when the request was well-formed but could not be processed. */
export class UnprocessableEntityError extends ExtendableError {}

/** Error thrown when the client has exceeded the allowed request rate. */
export class RateLimitExceededError extends ExtendableError {}

/** Error thrown when a request fails for a generic reason. */
export class RequestError extends ExtendableError {}

/** Error thrown when the client version is too old to use the API. */
export class UpdateRequiredError extends ExtendableError {}
