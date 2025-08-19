import { HttpsProxyAgent } from "https-proxy-agent";
import OAuth2Strategy, { Strategy } from "passport-oauth2";
import { Request } from "express";

type OIDCOptions = Record<string, unknown> & {
  originalQuery?: Record<string, unknown>;
};

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
    const opts = (options || {}) as OIDCOptions;
    opts.originalQuery = req.query as Record<string, unknown>;
    super.authenticate(req, opts);
  }

  authorizationParams(options: unknown) {
    const opts = options as OIDCOptions;
    return {
      ...(opts.originalQuery || {}),
      ...super.authorizationParams?.(options),
    };
  }
}
