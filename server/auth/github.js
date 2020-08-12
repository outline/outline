// @flow
import addHours from "date-fns/add_hours";
import Router from "koa-router";
import Sequelize from "sequelize";
import { githubAuth } from "../../shared/utils/routeHelpers";
import auth from "../middlewares/authentication";
import {
  Authentication,
  Collection,
  Integration,
  User,
  Event,
  Team,
} from "../models";
import * as Github from "../github";
import { getCookieDomain } from "../utils/domains";

const Op = Sequelize.Op;
const router = new Router();

// start the oauth process and redirect user to Github
router.get("github", async (ctx) => {
  const state = Math.random().toString(36).substring(7);

  ctx.cookies.set("state", state, {
    httpOnly: false,
    expires: addHours(new Date(), 1),
    domain: getCookieDomain(ctx.request.hostname),
  });
  ctx.redirect(githubAuth(state));
});

// signin callback from Github
router.get("github.callback", auth({ required: false }), async (ctx) => {
  const { code, error, state } = ctx.request.query;
  ctx.assertPresent(code || error, "code is required");
  ctx.assertPresent(state, "state is required");

  if (state !== ctx.cookies.get("state")) {
    ctx.redirect("/?notice=auth-error&error=state_mismatch");
    return;
  }
  if (error) {
    ctx.redirect(`/?notice=auth-error&error=${error}`);
    return;
  }

  const data = await Github.oauthAccess(code);
  const [profile, userEmails, teams] = await Promise.all([
    Github.userProfile(data.access_token),
    Github.userEmails(data.access_token),
    Github.teams(data.access_token),
  ]);

  // TODO: Getting first email and team in lists returned,
  // should we require configuring them elsewhere or having user select
  // the desired email and/or team?
  const [userEmail] = userEmails;
  const [githubTeam] = teams;

  const [team, isFirstUser] = await Team.findOrCreate({
    where: {
      githubId: githubTeam.id.toString(),
    },
    defaults: {
      name: githubTeam.login,
      avatarUrl: githubTeam.avatar_url,
    },
  });

  try {
    const [user, isFirstSignin] = await User.findOrCreate({
      where: {
        [Op.or]: [
          {
            service: "github",
            serviceId: profile.id.toString(),
          },
          {
            service: { [Op.eq]: null },
            email: userEmail.email,
          },
        ],
        teamId: team.id,
      },
      defaults: {
        service: "github",
        serviceId: profile.id.toString(),
        name: profile.name,
        email: userEmail.email,
        isAdmin: isFirstUser,
        avatarUrl: profile.avatar_url,
      },
    });

    // update the user with fresh details if they just accepted an invite
    if (!user.serviceId || !user.service) {
      await user.update({
        service: "github",
        serviceId: profile.id.toString(),
        avatarUrl: profile.avatar_url,
      });
    }

    // update email address if it's changed in Github
    if (!isFirstSignin && userEmail.email !== user.email) {
      await user.update({ email: userEmail.email });
    }

    if (isFirstUser) {
      await team.provisionFirstCollection(user.id);
      await team.provisionSubdomain(githubTeam.login);
    }

    if (isFirstSignin) {
      await Event.create({
        name: "users.create",
        actorId: user.id,
        userId: user.id,
        teamId: team.id,
        data: {
          name: user.name,
          service: "github",
        },
        ip: ctx.request.ip,
      });
    }

    // set cookies on response and redirect to team subdomain
    ctx.signIn(user, team, "github", isFirstSignin);
  } catch (err) {
    if (err instanceof Sequelize.UniqueConstraintError) {
      const exists = await User.findOne({
        where: {
          service: "email",
          email: userEmail.email,
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

router.get("github.commands", auth({ required: false }), async (ctx) => {
  const { code, state, error } = ctx.request.query;
  const user = ctx.state.user;
  ctx.assertPresent(code || error, "code is required");

  if (error) {
    ctx.redirect(`/settings/integrations/github?error=${error}`);
    return;
  }

  // this code block accounts for the root domain being unable to
  // access authentcation for subdomains. We must forward to the appropriate
  // subdomain to complete the oauth flow
  if (!user) {
    if (state) {
      try {
        const team = await Team.findByPk(state);
        return ctx.redirect(
          `${team.url}/auth${ctx.request.path}?${ctx.request.querystring}`
        );
      } catch (err) {
        return ctx.redirect(
          `/settings/integrations/github?error=unauthenticated`
        );
      }
    } else {
      return ctx.redirect(
        `/settings/integrations/github?error=unauthenticated`
      );
    }
  }

  const endpoint = `${process.env.URL || ""}/auth/github.commands`;
  const data = await Github.oauthAccess(code, endpoint);

  const authentication = await Authentication.create({
    service: "github",
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(","),
  });

  await Integration.create({
    service: "github",
    type: "command",
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
  });

  ctx.redirect("/settings/integrations/github");
});

router.get("github.post", auth({ required: false }), async (ctx) => {
  const { code, error, state } = ctx.request.query;
  const user = ctx.state.user;
  ctx.assertPresent(code || error, "code is required");

  const collectionId = state;
  ctx.assertUuid(collectionId, "collectionId must be an uuid");

  if (error) {
    ctx.redirect(`/settings/integrations/github?error=${error}`);
    return;
  }

  // this code block accounts for the root domain being unable to
  // access authentcation for subdomains. We must forward to the
  // appropriate subdomain to complete the oauth flow
  if (!user) {
    try {
      const collection = await Collection.findByPk(state);
      const team = await Team.findByPk(collection.teamId);
      return ctx.redirect(
        `${team.url}/auth${ctx.request.path}?${ctx.request.querystring}`
      );
    } catch (err) {
      return ctx.redirect(
        `/settings/integrations/github?error=unauthenticated`
      );
    }
  }

  const endpoint = `${process.env.URL || ""}/auth/github.post`;
  const data = await Github.oauthAccess(code, endpoint);

  const authentication = await Authentication.create({
    service: "github",
    userId: user.id,
    teamId: user.teamId,
    token: data.access_token,
    scopes: data.scope.split(","),
  });

  await Integration.create({
    service: "github",
    type: "post",
    userId: user.id,
    teamId: user.teamId,
    authenticationId: authentication.id,
    collectionId,
    events: [],
    // TODO: update for GitHub? The following were for Slack
    // settings: {
    //   url: data.incoming_webhook.url,
    //   channel: data.incoming_webhook.channel,
    //   channelId: data.incoming_webhook.channel_id,
    // },
  });

  ctx.redirect("/settings/integrations/github");
});

export default router;
