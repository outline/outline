// @flow
import Sequelize from 'sequelize';
import passport from 'koa-passport';
import auth from '../middlewares/authentication';
import { OAuth2Strategy } from "passport-oauth";
import { type Context } from 'koa';
import { User, Team, Event } from '../models';
import { StateStore } from "../lib/koa-passport-state-store";

const Op = Sequelize.Op;
export type KoaHandler = (ctx: Context, next: () => Promise<any>) => Promise<void> | void;

export type UserImport = {
  id: string,
  name: string,
  email: string,
  avatarUrl: string,
};

export type TeamImport = {
  id: string,
  name: string,
  avatarUrl: string,
}

export type OAuth2Import = {
  user: UserImport,
  team: TeamImport,
};

function authorizeOAuth2Handler(service: string): KoaHandler {
  return passport.authenticate(service);
}

function callbackOAuth2Handler(service: string): [KoaHandler, KoaHandler] {
  return [auth({ required: false}), async ctx => {
    const { code, error, state } = ctx.request.query;
    ctx.assertPresent(code || error, 'code is required');
    ctx.assertPresent(state, 'state is required');

    if (state !== ctx.cookies.get('state')) {
      ctx.redirect('/?notice=auth-error&error=state_mismatch');
      return;
    }
    if (error) {
      ctx.redirect(`/?notice=auth-error&error=${error}`);
      return;
    }

    let user: User;
    let team: Team;
    let err: Error;
    try {
      const result = await authorize(service, ctx);

      // extract possible user and team data before 
      // handling the error
      let isFirstSignin: boolean;
      [user, isFirstSignin] = result.UserFindOrCreate;
      [team] = result.TeamFindOrCreate;
      if (result.Error) {
        throw result.Error;
      }

      ctx.signIn(user, team, service, isFirstSignin);
    } catch(err) {
      if (user && team) {
        if (err instanceof Sequelize.UniqueConstraintError) {
          const exists = await User.findOne({
            where: {
              service: 'email',
              email: user.email,
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
      }

      throw err;
    }
  }];
}

export type OAuth2ImportCallback = (
  accessToken: string,
  refreshToken: string,
) => Promise<OAuth2Import> | OAuth2Import;

export type OAuth2ImportOptions = {
  clientId: string,
  clientSecret: string,
  tokenUrl: string,
  authorizationUrl: string,
  scope?: string[],
  state?: string,
  serviceKey: "slackId" | "googleId"
};

export function registerOAuth2(
  service: string,
  importData: OAuth2ImportCallback,
  opts: OAuth2ImportOptions,
): [KoaHandler, [KoaHandler, KoaHandler]] {

  async function _importData(
    accessToken: string,
    refreshToken: string,
    data: OAuth2Import,
    done: (err: ?Error, log: TransactionLog) => void,
  ) {
    try {
      data = await importData(accessToken, refreshToken);

      const [team, isFirstUser] = await Team.findOrCreate({
        where: {
          [opts.serviceKey || "slackId"]: data.team.id,
        },
        defaults: {
          name: data.team.name,
          avatarUrl: data.team.avatarUrl,
        },
      });

      const [user, isFirstSignin] = await User.findOrCreate({
        where: {
          [Op.or]: [
            {
              service: service,
              serviceId: data.user.id,
            },
            {
              service: { [Op.eq]: null },
              email: data.user.email,
            },
          ],
          teamId: team.id,
        },
        defaults: {
          service: service,
          serviceId: data.user.id,
          name: data.user.name,
          email: data.user.email,
          isAdmin: isFirstUser,
          avatarUrl: data.user.avatarUrl,
        },
      });

      // update the user with fresh details if they just accepted an invite
      if (!user.serviceId || !user.service) {
        await user.update({
          service: service,
          serviceId: data.user.id,
          avatarUrl: data.user.avatarUrl,
        });
      }

      // update email address if it's changed in Slack
      if (!isFirstSignin && data.user.email !== user.email) {
        await user.update({ email: data.user.email });
      }

      if (isFirstUser) {
        await team.provisionFirstCollection(user.id);
        await team.provisionSubdomain(team.domain);
      }

      return done(null, {
        UserFindOrCreate: [User, isFirstSignin, data.user],
        TeamFindOrCreate: [Team, isFirstUser, data.team],
      });

    } catch(err) {
      return done(err, {
        UserFindOrCreate: [,, data.user],
        TeamFindOrCreate: [,, data.team],
      })
    }
  }

  passport.use(service, new OAuth2Strategy(
    {
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,

      tokenUrl: opts.tokenUrl,
      authorizationUrl: opts.authorizationUrl,

      state: true,
      store: new StateStore({ key: opts.state || "state" }),
    },
    _importData,
  ));

  return [authorizeOAuth2Handler(service), callbackOAuth2Handler(service)];
}

type AuthorizeResult = TransactionLog & {
  Error?: Error,
  Info: string,
  Status: string,
};

type TransactionLog = {
  TeamFindOrCreate: [Team, boolean, TeamImport],
  UserFindOrCreate: [User, boolean, UserImport],
};

/**
 * Wraps passport's authorize method and returns the authorization results
 * as awaitable Promise. authorize() does not set the user on the context.
 */
export function authorize(
  strategy: string,
  ctx: Context
): Promise<AuthorizeResult> {
  return new Promise((resolve, reject) => {
    passport.authorize(
      strategy,
      (err: Error, log: TransactionLog, info: string, status: string) => {
        resolve({
          Error: err,
          Info: info,
          Status: status,
          ...log,
        });
      }
    )(ctx);
  });
}
