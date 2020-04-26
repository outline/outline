// @flow
import Sequelize from 'sequelize';
import passport from 'koa-passport';
import auth from '../middlewares/authentication';
import { OAuth2Strategy } from 'passport-oauth';
import { type Context } from 'koa';
import { User, Team, Event } from '../models';
import * as crypto from 'crypto';
import addHours from 'date-fns/add_hours';

export function mountNativePassport(service: string, strategy: any, opts: {
  authorizeRequest?: bool,
  preAuthorizeHook?: (ctx: Context) => Promise<void> | void,
  postAuthorizeHook?: (ctx: Context) => Promise<void> | void,
  authorizeSucceededHook?: (ctx: Context, result: any, info: string, status: string) => Promise<void> | void,
  authorizeFailedHook?: (ctx: Context, err: Error, result: any, info: string, status: string) => Promise<void> | void,
} = { authorizeRequest: true }) {

  passport.use(service, strategy);
  return [passport.authenticate(service), [auth({ required: false }), async ctx => {
    if (opts.preAuthorizeHook) {
      try {
        await opts.preAuthorizeHook(ctx);
      } catch(err) {
        return;
      }
    }

    if (opts.authorizeRequest) {
      try {
        const { err, result, info, status } = await new Promise((resolve, reject) => {
          passport.authorize(service, (err: Error, result: any, info: string, status: string) => {
            resolve({
              err: err,
              result: result,
              info: info,
              status: status,
            });
          })
        });
        if (err && opts.authorizeFailedHook) {
          await opts.authorizeFailedHook(err, result, info, status);
        } else {
          await opts.authorizeSucceededHook(result, info, status);
        }
      } catch(err) {
        if (opts.authorizeFailedHook) {
          await opts.authorizeFailedHook(err);
        } else {
          throw err;
        }
      }
    }

     if (opts.postAuthorizeHook) {
      try {
        await opts.postAuthorizeHook(ctx);
      } catch(err) {
        return;
      }
    }
  }]];
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function uniqueId(length: number) {
  const bytes = crypto.pseudoRandomBytes(length);

  let r = [];
  for (let i = 0; i < bytes.length; i++) {
    r.push(CHARS[bytes[i] % CHARS.length]);
  }

  return r.join('');
}

function removeDays(d: Date, x: number): Date {
  d.setDate(d.getDate() - x);
  return d;
}

function StateStore(options: { key?: string }) {
  if (options) {
    this.key = (options && options.key) || 'state';
  }
}

StateStore.prototype.store = function(req: any, callback: any) {
  const state = uniqueId(24);

  req.cookies.set(this.key, state, {
    httpOnly: false,
    expires: addHours(new Date(), 1),
  });

  callback(null, state);
};

StateStore.prototype.verify = function(
  req: any,
  providedState: any,
  callback: any
) {
  const state = req.cookies.get(this.key);
  if (!state) {
    return callback(null, false, {
      message: 'Unable to verify authorization request state.',
    });
  }

  req.cookies.set(this.key, '', {
    httpOnly: false,
    expires: removeDays(new Date(), 1),
  });

  if (state.handle !== providedState) {
    return callback(null, false, {
      message: 'Invalid authorization request state.',
    });
  }

  callback(null, true);
};

export type Deserialized = {
  user: {
    id: string,
    name: string,
    email: string,
    avatarUrl: string,
  },
  team: {
    id: string,
    name: string,
    avatarUrl: string,
  }
}

export type DeserializedUser = {
  id: string,
  name: string,
  email: string,
  avatarUrl: string,
}

export type DeserializedTeam = {
  id: string,
  name: string,
  avatarUrl: string,
}

export type DeserializeTokenFn = (accessToken: string, refreshToken: string) => Promise<{
  user: DeserializedUser,
  team: DeserializedTeam,
}>

type AuthorizationResult = {
  user: User,
  isNewUser: boolean,
  rawUser: DeserializedUser,
  team: Team,
  isNewTeam: boolean,
  rawTeam: DeserializedTeam,
}

export function mountOAuth2Passport(service: string, deserializeToken: DeserializeTokenFn, opts: {
  clientID: string,
  clientSecret: string,
  tokenURL: string,
  authorizationURL: string,
  callbackURL?: string,
  scopes?: string[],
  state?: string,
  column: 'slackId' | 'googleId',
}) {

  // Validate state parameter before authorizing
  async function preAuthorizeHook(ctx: Context) {
    const { code, error, state } = ctx.request.query;
    ctx.assertPresent(code || error, 'code is required');
    ctx.assertPresent(state, 'state is required');

    if (state !== ctx.cookies.get('state')) {
      ctx.redirect('/?notice=auth-error&error=state_mismatch');
      throw new Error('authentication failed: state mismatch');
    }
    if (error) {
      ctx.redirect(`/?notice=auth-error&error=${error}`);
      throw new Error('authentication failed: general error');
    }
  }

  // Called when authorization succeeded, the tokens were deserialized and the database
  // entries were written
  async function authorizeSucceededHook(ctx: Context, result: AuthorizationResult, info: string, status: string) {
    ctx.signIn(result.user, result.team, service, result.isNewUser);
  }

  // Called when authorization failed
  async function authorizeFailedHook(ctx: Context, err: Error, result: AuthorizationResult, info: string, status: string) {
    if (result && result.user && result.team && err instanceof Sequelize.UniqueConstraintError) {
      const exists = await User.findOne({
        where: {
          service: 'email',
          email: result.user.email,
          teamId: result.team.id,
        },
      });

      if (exists) {
        ctx.redirect(`${team.url}?notice=email-auth-required`);
      } else {
        ctx.redirect(`${team.url}?notice=auth-error`);
      }

      return;
    }

    // will bubble through passport onto the koa stack handler
    throw err;
  }

  // Called by passport.js when accessToken and refreshToken were obtained
  async function importUser(accessToken: string, refreshToken: string, _: any, done: (err: ?Error, result: AuthorizationResult) => void) {
    
    let err: ?Error;
    let result: AuthorizationResult = {};
    try {
      const { rawUser, rawTeam } = await deserializeToken(accessToken, refreshToken);
      result = { ...result, rawUser, rawTeam };

      const [team, isNewTeam] = await Team.findOrCreate({
        where: {
          [opts.column || 'slackId']: rawTeam.id,
        },
        defaults: {
          name: rawTeam.name,
          avatarUrl: rawTeam.avatarUrl,
        },
      });
      result = { ...result, team, isNewTeam };

      const [user, isNewUser] = await User.findOrCreate({
        where: {
          [Op.or]: [
            {
              service: service,
              serviceId: rawUser.id,
            },
            {
              service: { [Op.eq]: null },
              email: rawUser.email,
            },
          ],
          teamId: team.id,
        },
        defaults: {
          service: service,
          serviceId: rawUser.id,
          name: rawUser.name,
          email: rawUser.email,
          isAdmin: isNewTeam,
          avatarUrl: rawUser.avatarUrl,
        },
      });
      result = { ...result, user, isNewUser };

      // update the user with fresh details if they just accepted an invite
      if (!user.serviceId || !user.service) {
        await user.update({
          service: service,
          serviceId: rawUser.id,
          avatarUrl: rawUser.avatarUrl,
        });
      }

      // update email address if it's changed
      if (!isFirstSignin && rawUser.email !== user.email) {
        await user.update({ email: rawUser.email });
      }

      if (isNewTeam) {
        await team.provisionFirstCollection(user.id);
        await team.provisionSubdomain(team.domain);
      }
    } catch(caughtError) {
      err = caughtError;
    }

    return done(err, result);
  }

  const strategy = new OAuth2Strategy({
    clientID: opts.clientId,
    clientSecret: opts.clientSecret,
    tokenURL: opts.tokenUrl,
    authorizationURL: opts.authorizationURL,
    callbackURL: opts.callbackURL || `${process.env.URL || ''}/auth/${service}.callback`,
    state: true,
    store: new StateStore({ key: opts.state || 'state' });
  }, importUser);

  return mountNativePassport(service, strategy, {
    authorizeRequest: true,
    preAuthorizeHook: preAuthorizeHook,
    authorizeSucceededHook: authorizeSucceededHook,
    authorizeFailedHook: authorizeFailedHook,
  });
}