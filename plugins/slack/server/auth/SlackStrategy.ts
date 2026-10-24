import type { Profile } from "passport";
import type {
  StrategyOptionsWithRequest,
  VerifyFunctionWithRequest,
} from "passport-oauth2";
import { InternalOAuthError, Strategy } from "passport-oauth2";

/**
 * Passport strategy that authenticates with Slack using OAuth 2.0.
 */
export class SlackStrategy extends Strategy {
  constructor(
    options: SlackStrategyOptions,
    verify: VerifyFunctionWithRequest<SlackProfile>
  ) {
    super(
      {
        ...options,
        authorizationURL: "https://slack.com/oauth/authorize",
        tokenURL: "https://slack.com/api/oauth.access",
      },
      verify
    );
    this.name = "slack";
    this._oauth2.useAuthorizationHeaderforGET(true);
  }

  /**
   * Loads the user profile from the Slack users.identity endpoint.
   *
   * @param accessToken the access token for the user.
   * @param done callback to receive the profile.
   */
  userProfile(
    accessToken: string,
    done: (err?: unknown, profile?: SlackProfile) => void
  ) {
    this._oauth2.get(
      "https://slack.com/api/users.identity",
      accessToken,
      (err, body) => {
        if (err) {
          return done(
            new InternalOAuthError("Failed to fetch user profile", err)
          );
        }

        try {
          const json: SlackIdentity = JSON.parse(String(body));
          if (!json.ok) {
            return done(
              new InternalOAuthError("Failed to fetch user profile", json.error)
            );
          }

          done(null, {
            provider: "slack",
            id: json.user.id,
            displayName: json.user.name,
            team: json.team,
            user: json.user,
          });
        } catch (parseErr) {
          done(parseErr);
        }
      }
    );
  }
}

export interface SlackProfile extends Profile {
  team: SlackIdentity["team"];
  user: SlackIdentity["user"];
}

type SlackStrategyOptions = Omit<
  StrategyOptionsWithRequest,
  "authorizationURL" | "tokenURL"
>;

interface SlackIdentity {
  ok: boolean;
  error?: string;
  team: {
    id: string;
    name: string;
    domain: string;
    image_192: string;
    image_230: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image_192: string;
    image_230: string;
  };
}
