import { HttpsProxyAgent } from "https-proxy-agent";
import {
  Strategy,
  StrategyOptionsWithRequest,
  VerifyFunctionWithRequest,
} from "passport-oauth2";
import { Request } from "express";

interface OIDCOptions extends StrategyOptionsWithRequest {
  originalQuery?: Record<string, unknown>;
}

export class OIDCStrategy extends Strategy {
  constructor(
    options: StrategyOptionsWithRequest,
    verify: VerifyFunctionWithRequest
  ) {
    super(options, verify);

    if (process.env.https_proxy) {
      const httpsProxyAgent = new HttpsProxyAgent(process.env.https_proxy);
      this._oauth2.setAgent(httpsProxyAgent);
    }
  }

  authenticate(req: Request, options?: Record<string, unknown>) {
    const opts = options ? { ...options } : ({} as OIDCOptions);
    opts.originalQuery = req.query;
    super.authenticate(req, opts);
  }

  authorizationParams(options: OIDCOptions) {
    return {
      ...options.originalQuery,
      ...super.authorizationParams?.(options),
    };
  }
}
