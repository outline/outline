import type { Request } from "express";
import { HttpsProxyAgent } from "https-proxy-agent";
import type OAuth2Strategy from "passport-oauth2";
import { Strategy } from "passport-oauth2";

interface AuthenticateOptions {
  originalQuery?: Request["query"];
  [key: string]: unknown;
}

export class OIDCStrategy extends Strategy {
  constructor(
    options: OAuth2Strategy.StrategyOptionsWithRequest,
    verify: OAuth2Strategy.VerifyFunctionWithRequest
  ) {
    super(options, verify);

    if (process.env.https_proxy) {
      const httpsProxyAgent = new HttpsProxyAgent(process.env.https_proxy);
      this._oauth2.setAgent(httpsProxyAgent);
    }
  }

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
