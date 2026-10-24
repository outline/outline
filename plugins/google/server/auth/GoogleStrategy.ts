import type { Profile } from "passport";
import type {
  StrategyOptionsWithRequest,
  VerifyFunctionWithRequest,
} from "passport-oauth2";
import { InternalOAuthError, Strategy } from "passport-oauth2";

/**
 * Passport strategy that authenticates with Google using OAuth 2.0.
 */
export class GoogleStrategy extends Strategy {
  constructor(
    options: GoogleStrategyOptions,
    verify: VerifyFunctionWithRequest<GoogleProfile>
  ) {
    super(
      {
        ...options,
        authorizationURL: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenURL: "https://www.googleapis.com/oauth2/v4/token",
      },
      verify
    );
    this.name = "google";
    this._oauth2.useAuthorizationHeaderforGET(true);
  }

  /**
   * Loads the user profile from the Google userinfo endpoint.
   *
   * @param accessToken the access token for the user.
   * @param done callback to receive the profile.
   */
  userProfile(
    accessToken: string,
    done: (err?: unknown, profile?: GoogleProfile) => void
  ) {
    this._oauth2.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      accessToken,
      (err, body) => {
        if (err) {
          return done(
            new InternalOAuthError("Failed to fetch user profile", err)
          );
        }

        try {
          const raw = String(body);
          const json: GoogleUserInfo = JSON.parse(raw);

          done(null, {
            provider: "google",
            id: json.sub,
            displayName: json.name ?? "",
            name: {
              givenName: json.given_name ?? "",
              familyName: json.family_name ?? "",
            },
            emails: [{ value: json.email }],
            photos: json.picture ? [{ value: json.picture }] : undefined,
            email: json.email,
            picture: json.picture,
            _raw: raw,
            _json: json,
          });
        } catch (parseErr) {
          done(parseErr);
        }
      }
    );
  }

  /**
   * Returns the Google specific parameters for the authorization request.
   *
   * @param options the options passed to authenticate.
   * @returns the extra authorization parameters.
   */
  authorizationParams(options: GoogleAuthenticateOptions) {
    return {
      ...(options.accessType ? { access_type: options.accessType } : {}),
      ...(options.prompt ? { prompt: options.prompt } : {}),
      ...(options.hostedDomain ? { hd: options.hostedDomain } : {}),
    };
  }
}

export interface GoogleProfile extends Profile {
  email: string;
  picture?: string;
  _raw: string;
  _json: GoogleUserInfo;
}

type GoogleStrategyOptions = Omit<
  StrategyOptionsWithRequest,
  "authorizationURL" | "tokenURL"
>;

interface GoogleAuthenticateOptions {
  accessType?: "online" | "offline";
  prompt?: string;
  hostedDomain?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  hd?: string;
}
