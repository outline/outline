import querystring from "querystring";
import { addMonths } from "date-fns";
import { Context } from "koa";
import pick from "lodash/pick";
import { Client } from "@shared/types";
import { getCookieDomain } from "@shared/utils/domains";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { Event, Collection, View } from "@server/models";
import { AuthenticationResult, AuthenticationType } from "@server/types";

/**
 * Parse and return the details from the "sessions" cookie in the request, if
 * any. The cookie is on the apex domain and includes session details for
 * other subdomains.
 *
 * @param ctx The Koa context
 * @returns The session details
 */
export function getSessionsInCookie(ctx: Context) {
  try {
    const sessionCookie = ctx.cookies.get("sessions") || "";
    const decodedSessionCookie = decodeURIComponent(sessionCookie);
    return decodedSessionCookie ? JSON.parse(decodedSessionCookie) : {};
  } catch (err) {
    return {};
  }
}

export async function signIn(
  ctx: Context,
  service: string,
  { user, team, client, isNewTeam }: AuthenticationResult
) {
  if (team.isSuspended) {
    return ctx.redirect("/?notice=team-suspended");
  }
  if (user.isSuspended) {
    return ctx.redirect("/?notice=user-suspended");
  }

  if (isNewTeam) {
    // see: scenes/Login/index.js for where this cookie is written when
    // viewing the /login or /create pages. It is a URI encoded JSON string.
    const cookie = ctx.cookies.get("signupQueryParams");

    if (cookie) {
      try {
        const signupQueryParams = pick(
          JSON.parse(querystring.unescape(cookie)),
          ["ref", "utm_content", "utm_medium", "utm_source", "utm_campaign"]
        );
        await team.update({
          signupQueryParams,
        });
      } catch (error) {
        Logger.error(`Error persisting signup query params`, error);
      }
    }
  }

  // update the database when the user last signed in
  await user.updateSignedIn(ctx.request.ip);

  // don't await event creation for a faster sign-in
  void Event.create({
    name: "users.signin",
    actorId: user.id,
    userId: user.id,
    teamId: team.id,
    authType: AuthenticationType.APP,
    data: {
      name: user.name,
      service,
    },
    ip: ctx.request.ip,
  });
  const domain = getCookieDomain(ctx.request.hostname, env.isCloudHosted);
  const expires = addMonths(new Date(), 3);

  // set a cookie for which service we last signed in with. This is
  // only used to display a UI hint for the user for next time
  ctx.cookies.set("lastSignedIn", service, {
    httpOnly: false,
    sameSite: true,
    expires: new Date("2100"),
    domain,
  });

  // set a transfer cookie for the access token itself and redirect
  // to the teams subdomain if subdomains are enabled
  if (env.isCloudHosted && team.subdomain) {
    // get any existing sessions (teams signed in) and add this team
    const existing = getSessionsInCookie(ctx);
    const sessions = encodeURIComponent(
      JSON.stringify({
        ...existing,
        [team.id]: {
          name: team.name,
          logoUrl: team.avatarUrl,
          url: team.url,
        },
      })
    );
    ctx.cookies.set("sessions", sessions, {
      httpOnly: false,
      expires,
      domain,
    });

    // If the authentication request originally came from the desktop app then we send the user
    // back to a screen in the web app that will immediately redirect to the desktop. The reason
    // to do this from the client is that if you redirect from the server then the browser ends up
    // stuck on the SSO screen.
    if (client === Client.Desktop) {
      ctx.redirect(
        `${team.url}/desktop-redirect?token=${user.getTransferToken()}`
      );
    } else {
      ctx.redirect(
        `${team.url}/auth/redirect?token=${user.getTransferToken()}`
      );
    }
  } else {
    ctx.cookies.set("accessToken", user.getJwtToken(expires), {
      sameSite: "lax",
      expires,
    });

    const defaultCollectionId = team.defaultCollectionId;

    if (defaultCollectionId) {
      const collection = await Collection.findOne({
        where: {
          id: defaultCollectionId,
          teamId: team.id,
        },
      });

      if (collection) {
        ctx.redirect(`${team.url}${collection.url}`);
        return;
      }
    }

    const [collection, view] = await Promise.all([
      Collection.findFirstCollectionForUser(user),
      View.findOne({
        where: {
          userId: user.id,
        },
      }),
    ]);
    const hasViewedDocuments = !!view;

    ctx.redirect(
      !hasViewedDocuments && collection
        ? `${team.url}${collection.url}`
        : `${team.url}/home`
    );
  }
}
