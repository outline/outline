// flow-typed signature: 573c576fe34eb3c3c65dd7a9c90a46d2
// flow-typed version: b43dff3e0e/http-errors_v1.x.x/flow_>=v0.25.x

declare module 'http-errors' {
  declare class SpecialHttpError extends HttpError {
    constructor(): SpecialHttpError;
  }
  declare class HttpError extends Error {
    expose: bool;
    message: string;
    status: number;
    statusCode: number;
  }
  declare module.exports: {
    (status?: number, message?: string, props?: Object): HttpError;
    HttpError: typeof HttpError;
    BadRequest: typeof SpecialHttpError;
    Unauthorized: typeof SpecialHttpError;
    PaymentRequired: typeof SpecialHttpError;
    Forbidden: typeof SpecialHttpError;
    NotFound: typeof SpecialHttpError;
    MethodNotAllowed: typeof SpecialHttpError;
    NotAcceptable: typeof SpecialHttpError;
    ProxyAuthenticationRequired: typeof SpecialHttpError;
    RequestTimeout: typeof SpecialHttpError;
    Conflict: typeof SpecialHttpError;
    Gone: typeof SpecialHttpError;
    LengthRequired: typeof SpecialHttpError;
    PreconditionFailed: typeof SpecialHttpError;
    PayloadTooLarge: typeof SpecialHttpError;
    URITooLong: typeof SpecialHttpError;
    UnsupportedMediaType: typeof SpecialHttpError;
    RangeNotStatisfiable: typeof SpecialHttpError;
    ExpectationFailed: typeof SpecialHttpError;
    ImATeapot: typeof SpecialHttpError;
    MisdirectedRequest: typeof SpecialHttpError;
    UnprocessableEntity: typeof SpecialHttpError;
    Locked: typeof SpecialHttpError;
    FailedDependency: typeof SpecialHttpError;
    UnorderedCollection: typeof SpecialHttpError;
    UpgradeRequired: typeof SpecialHttpError;
    PreconditionRequired: typeof SpecialHttpError;
    TooManyRequests: typeof SpecialHttpError;
    RequestHeaderFieldsTooLarge: typeof SpecialHttpError;
    UnavailableForLegalReasons: typeof SpecialHttpError;
    InternalServerError: typeof SpecialHttpError;
    NotImplemented: typeof SpecialHttpError;
    BadGateway: typeof SpecialHttpError;
    ServiceUnavailable: typeof SpecialHttpError;
    GatewayTimeout: typeof SpecialHttpError;
    HTTPVersionNotSupported: typeof SpecialHttpError;
    VariantAlsoNegotiates: typeof SpecialHttpError;
    InsufficientStorage: typeof SpecialHttpError;
    LoopDetected: typeof SpecialHttpError;
    BandwidthLimitExceeded: typeof SpecialHttpError;
    NotExtended: typeof SpecialHttpError;
    NetworkAuthenticationRequired: typeof SpecialHttpError;
  }
}
