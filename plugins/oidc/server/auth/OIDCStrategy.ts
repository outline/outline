import { HttpsProxyAgent } from "https-proxy-agent";
import OAuth2Strategy, { Strategy } from "passport-oauth2";
import { Request } from "express";

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

  authenticate(req: Request, options?: unknown) {
    const opts = (options || {}) as Record<string, unknown>;
    opts.originalQuery = req.query;
    super.authenticate(req, opts);
  }

  authorizationParams(options: unknown) {
    return {
      ...options.originalQuery,
      ...super.authorizationParams?.(options),
    };
  }
}
