// @flow
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import invariant from "invariant";
import Router from "koa-router";
import { capitalize } from "lodash";
import Sequelize from "sequelize";
import auth from "../middlewares/authentication";
import { User, Team } from "../models";

const Op = Sequelize.Op;

const router = new Router();
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.URL}/auth/google.callback`
);
const allowedDomainsEnv = process.env.GOOGLE_ALLOWED_DOMAINS;

// start the oauth process and redirect user to Google
router.get("google", async (ctx) => {
  // Generate the url that will be used for the consent dialog.
  const authorizeUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
  ctx.redirect(authorizeUrl);
});

// signin callback from Google
router.get("google.callback", auth({ required: false }), async (ctx) => {
  const { code } = ctx.request.query;
  ctx.assertPresent(code, "code is required");
  const response = await client.getToken(code);
  client.setCredentials(response.tokens);

  const profile = await client.request({
    url: "https://www.googleapis.com/oauth2/v1/userinfo",
  });

  if (!profile.data.hd) {
    ctx.redirect("/?notice=google-hd");
    return;
  }

  // allow all domains by default if the env is not set
  const allowedDomains = allowedDomainsEnv && allowedDomainsEnv.split(",");
  if (allowedDomains && !allowedDomains.includes(profile.data.hd)) {
    ctx.redirect("/?notice=hd-not-allowed");
    return;
  }

  const googleId = profile.data.hd;
  const hostname = profile.data.hd.split(".")[0];
  const teamName = capitalize(hostname);

  // attempt to get logo from Clearbit API. If one doesn't exist then
  // fall back to using tiley to generate a placeholder logo
  const hash = crypto.createHash("sha256");
  hash.update(googleId);
  const hashedGoogleId = hash.digest("hex");
  const cbUrl = `https://logo.clearbit.com/${profile.data.hd}`;
  const tileyUrl = `https://tiley.herokuapp.com/avatar/${hashedGoogleId}/${teamName[0]}.png`;
  const cbResponse = await fetch(cbUrl);
  const avatarUrl = cbResponse.status === 200 ? cbUrl : tileyUrl;

  let team, isFirstUser;
  try {
    [team, isFirstUser] = await Team.findOrCreate({
      where: {
        googleId,
      },
      defaults: {
        name: teamName,
        avatarUrl,
      },
    });
  } catch (err) {
    if (err instanceof Sequelize.UniqueConstraintError) {
      ctx.redirect(`/?notice=auth-error`);
      return;
    }
  }
  invariant(team, "Team must exist");

  try {
    const [user, isFirstSignin] = await User.findOrCreate({
      where: {
        [Op.or]: [
          {
            service: "google",
            serviceId: profile.data.id,
          },
          {
            service: { [Op.eq]: null },
            email: profile.data.email,
          },
        ],
        teamId: team.id,
      },
      defaults: {
        service: "google",
        serviceId: profile.data.id,
        name: profile.data.name,
        email: profile.data.email,
        isAdmin: isFirstUser,
        avatarUrl: profile.data.picture,
      },
    });

    // update the user with fresh details if they just accepted an invite
    if (!user.serviceId || !user.service) {
      await user.update({
        service: "google",
        serviceId: profile.data.id,
        avatarUrl: profile.data.picture,
      });
    }

    // update email address if it's changed in Google
    if (!isFirstSignin && profile.data.email !== user.email) {
      await user.update({ email: profile.data.email });
    }

    if (isFirstUser) {
      await team.provisionFirstCollection(user.id);
      await team.provisionSubdomain(hostname);
    }

    // set cookies on response and redirect to team subdomain
    ctx.signIn(user, team, "google", isFirstSignin);
  } catch (err) {
    if (err instanceof Sequelize.UniqueConstraintError) {
      const exists = await User.findOne({
        where: {
          service: "email",
          email: profile.data.email,
          teamId: team.id,
        },
      });

      if (exists) {
        ctx.redirect(`${team.url}?notice=email-auth-required`);
      } else {
        ctx.redirect(`${team.url}?notice=auth-error`);
      }

      return;
    }

    throw err;
  }
});

export default router;
