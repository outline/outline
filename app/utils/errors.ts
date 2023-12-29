import ExtendableError from "es6-error";

export class AuthorizationError extends ExtendableError {}

export class BadRequestError extends ExtendableError {}

export class NetworkError extends ExtendableError {}

export class NotFoundError extends ExtendableError {}

export class PaymentRequiredError extends ExtendableError {}

export class OfflineError extends ExtendableError {}

export class ServiceUnavailableError extends ExtendableError {}

export class BadGatewayError extends ExtendableError {}

export class RateLimitExceededError extends ExtendableError {}

export class RequestError extends ExtendableError {}

export class UpdateRequiredError extends ExtendableError {}
