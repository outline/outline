import { HttpsProxyAgent } from "https-proxy-agent";
import OAuth2Strategy, { Strategy } from "passport-oauth2";

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

  authenticate(req: any, options: any) {
    options.originalQuery = req.query;
    super.authenticate(req, options);
  }

  authorizationParams(options: any) {
    return {
      ...(options.originalQuery || {}),
      ...(super.authorizationParams?.(options) || {}),
    };
  }
}
