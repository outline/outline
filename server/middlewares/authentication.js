// @flow
import JWT from "jsonwebtoken";
import { type Context } from "koa";
import { User, ApiKey } from "../models";
import { getUserForJWT } from "../utils/jwt";
import { getCookieDomain } from "../utils/domains";
import { AuthenticationError, UserSuspendedError } from "../errors";
import addMonths from "date-fns/add_months";
import addMinutes from "date-fns/add_minutes";

export default function auth(options?: { required?: boolean } = {}) {
  return async function authMiddleware(ctx: Context, next: () => Promise<*>) {
    let token;

    const authorizationHeader = ctx.request.get("authorization");
    if (authorizationHeader) {
      const parts = authorizationHeader.split(" ");
      if (parts.length === 2) {
        const scheme = parts[0];
        const credentials = parts[1];

        if (/^Bearer$/i.test(scheme)) {
          token = credentials;
        }
      } else {
        throw new AuthenticationError(
          `Bad Authorization header format. Format is "Authorization: Bearer <token>"`
        );
      }
      // $FlowFixMe
    } else if (ctx.body && ctx.body.token) {
      token = ctx.body.token;
    } else if (ctx.request.query.token) {
      token = ctx.request.query.token;
    } else {
      token = ctx.cookies.get("accessToken");
    }

    if (!token && options.required !== false) {
      throw new AuthenticationError("Authentication required");
    }

    let user;
    if (token) {
      if (String(token).match(/^[\w]{38}$/)) {
        // API key
        let apiKey;
        try {
          apiKey = await ApiKey.findOne({
            where: {
              secret: token,
            },
          });
        } catch (e) {
          throw new AuthenticationError("Invalid API key");
        }

        if (!apiKey) throw new AuthenticationError("Invalid API key");

        user = await User.findByPk(apiKey.userId);
        if (!user) throw new AuthenticationError("Invalid API key");
      } else {
        // JWT
        user = await getUserForJWT(token);
      }

      if (user.isSuspended) {
        const suspendingAdmin = await User.findOne({
          where: { id: user.suspendedById },
          paranoid: false,
        });
        throw new UserSuspendedError({ adminEmail: suspendingAdmin.email });
      }

      // not awaiting the promise here so that the request is not blocked
      user.updateActiveAt(ctx.request.ip);

      ctx.state.token = token;
      ctx.state.user = user;
      if (!ctx.cache) ctx.cache = {};
      ctx.cache[user.id] = user;
    }

    ctx.signIn = async (user, team, service, isFirstSignin = false) => {
      if (user.isSuspended) {
        return ctx.redirect("/?notice=suspended");
      }

      // update the database when the user last signed in
      user.updateSignedIn(ctx.request.ip);

      const domain = getCookieDomain(ctx.request.hostname);
      const expires = addMonths(new Date(), 3);

      // set a cookie for which service we last signed in with. This is
      // only used to display a UI hint for the user for next time
      ctx.cookies.set("lastSignedIn", service, {
        httpOnly: false,
        expires: new Date("2100"),
        domain,
      });

      // set a transfer cookie for the access token itself and redirect
      // to the teams subdomain if subdomains are enabled
      if (process.env.SUBDOMAINS_ENABLED === "true" && team.subdomain) {
        // get any existing sessions (teams signed in) and add this team
        const existing = JSON.parse(
          decodeURIComponent(ctx.cookies.get("sessions") || "") || "{}"
        );
        const sessions = encodeURIComponent(
          JSON.stringify({
            ...existing,
            [team.id]: {
              name: team.name,
              logoUrl: team.logoUrl,
              url: team.url,
            },
          })
        );
        ctx.cookies.set("sessions", sessions, {
          httpOnly: false,
          expires,
          domain,
        });

        ctx.cookies.set("accessToken", user.getJwtToken(), {
          httpOnly: true,
          expires: addMinutes(new Date(), 1),
          domain,
        });
        ctx.redirect(`${team.url}/auth/redirect`);
      } else {
        ctx.cookies.set("accessToken", user.getJwtToken(), {
          httpOnly: false,
          expires,
        });
        ctx.redirect(`${team.url}/home${isFirstSignin ? "?welcome" : ""}`);
      }
    };

    return next();
  };
}

// Export JWT methods as a convenience
export const sign = JWT.sign;
export const verify = JWT.verify;
export const decode = JWT.decode;
