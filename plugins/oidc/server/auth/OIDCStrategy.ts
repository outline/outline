import type { Request } from "express";
import { Strategy } from "passport-oauth2";

interface AuthenticateOptions {
  originalQuery?: Request["query"];
  [key: string]: unknown;
}

export class OIDCStrategy extends Strategy {
  authenticate(req: Request, options: AuthenticateOptions) {
    options.originalQuery = req.query;
    super.authenticate(req, options);
  }

  authorizationParams(options: AuthenticateOptions) {
    return {
      ...options.originalQuery,
      ...super.authorizationParams?.(options),
    };
  }
}
