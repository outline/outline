// @flow
import Sequelize from 'sequelize';
import passport from 'koa-passport';
import auth from '../middlewares/authentication';
import { OAuth2Strategy } from 'passport-oauth';
import { type Context } from 'koa';
import { User, Team, Event } from '../models';
import crypto from 'crypto';
import addHours from 'date-fns/add_hours';
import { customError } from '../errors';

type TPossiblyArray<T> = T | Array<T>;

// eslint-disable-next-line prettier/prettier
type ContextVoidHookSet = TPossiblyArray<(ctx: Context) => Promise<void> | void>;
// eslint-disable-next-line prettier/prettier
type PassportNoErrHookSet<R> = TPossiblyArray<(ctx: Context, result: R, info: string, status: string) => Promise<void> | void>;
// eslint-disable-next-line prettier/prettier
type PassportNoErrPossiblyVoidHookSet<R> = TPossiblyArray<(ctx: Context, result: ?R, info: ?string, status: ?string) => Promise<void> | void>;
// eslint-disable-next-line prettier/prettier
type PassportErrHookSet<R> = TPossiblyArray<(ctx: Context, err: Error, result: ?R, info: ?string, status: ?string) => Promise<void> | void>;

export type NativePassportOptions<R> = {
  // authorizeRequest is by default true.
  // Set to false to disable authorization.
  authorizeRequest?: boolean,

  // preAuthorizeHook is a set of hooks which
  // run before the passport.authorize() is
  // called. Use it to validate the request
  preAuthorizeHook?: ContextVoidHookSet,

  // postAuthorizeHook is a set of hooks which
  // run after passport.authorize() was called
  // and when no errors occured.
  postAuthorizeHook?: PassportNoErrPossiblyVoidHookSet<R>,

  // authorizeSucceededHook is a set of hooks
  // which process the passport.authorize()
  // results. Throwing errors here will stop the
  // authorizeSucceededHook queue of pending hooks
  // and start the authorizeFailedHook queue.
  // Ultimatively, if not handled, the error will
  // bubble up to the general koa error handler.
  // If you want to define your own errors, so that
  // your custom authorizeFailedHook can identify it,
  // using customError() from ./errors.js
  authorizeSucceededHook?: PassportNoErrHookSet<R>,

  // authorizeFailedHook is a set of hooks
  // which process errors from either
  // passport.authorize() or from the
  // authorizeSucceededHooks. If one handled the error,
  // it is supposed to just return. If one is not
  // responsible for handling the error, it is
  // supposed to throw the error again.
  // Ultimatively, if not handled, the error will
  // bubble up to the general koa error handler
  authorizeFailedHook?: PassportErrHookSet<R>,
};

export function mountNativePassport<R>(
  service: string,
  strategy: any,
  opts: NativePassportOptions<R> = { authorizeRequest: true }
) {
  // ensure that opts.xxxHook are actually arrays
  if (opts.preAuthorizeHook && !(opts.preAuthorizeHook instanceof Array)) {
    opts.preAuthorizeHook = [opts.preAuthorizeHook];
  }
  if (opts.postAuthorizeHook && !(opts.postAuthorizeHook instanceof Array)) {
    opts.postAuthorizeHook = [opts.postAuthorizeHook];
  }
  if (
    opts.authorizeSucceededHook &&
    !(opts.authorizeSucceededHook instanceof Array)
  ) {
    opts.authorizeSucceededHook = [opts.authorizeSucceededHook];
  }
  if (
    opts.authorizeFailedHook &&
    !(opts.authorizeFailedHook instanceof Array)
  ) {
    opts.authorizeFailedHook = [opts.authorizeFailedHook];
  }

  passport.use(service, strategy);

  return [
    /*
     * passport.authenticate(service) is called to initiate 
     * the authentication process. In OAuth2-processes, this
     * includes generating a state parameter and redirecting
     * to the authentication provider 
     */
    passport.authenticate(service),

    /*
     * These handlers are the callback handlers. 
     * auth({ required: false}) appends the ctx.signIn() method.
     * The custom handler uses a sophisticated routing structure
     * to execute all hooks and call a awaitable
     * passport.authorize(). The wrapped passport method should
     * never reject, we will take care of that in our
     * authorizeFailedHooks.
     */
    [
      auth({ required: false }),
      async (ctx: Context) => {
        // Call the preAuthorizeHooks if present. If something is
        // thrown in them, it will instantly bubble up to the global
        // koa handler.
        if (
          opts.preAuthorizeHook &&
          /* ensure type no-op */ opts.preAuthorizeHook instanceof Array
        ) {
          for (let i = 0; i < opts.preAuthorizeHook.length; i++) {
            await opts.preAuthorizeHook[i](ctx);
          }
        }

        let srcResult: R;
        let srcInfo: string;
        let srcStatus: string;

        if (opts.authorizeRequest) {
          let srcErr: Error;
          let errSrcIsErrHook = false;
          try {
            // extract the authorize results from passport
            const { err, result, info, status } = await new Promise(
              (resolve, reject) => {
                passport.authorize(
                  service,
                  (err: Error, result: R, info: string, status: string) => {
                    resolve({ err, result, info, status });
                  }
                )(ctx);
              }
            );
            srcErr = err;
            srcResult = result;
            srcInfo = info;
            srcStatus = status;

            if (err) {
              // [1] If there was an error, handle if possible. Otherwise throw it.
              // By throwing the error in the fail hook, it indicates that it is
              // not responsible for handling. If it throws another error
              // something bad happend, so the error is thrown in [2]. If nothing happens,
              // the error must be resolved. Because there was an error, the postAuthorizeHook
              // won't be called, so return.
              if (
                opts.authorizeFailedHook &&
                /* ensure type no-op */ opts.authorizeFailedHook instanceof
                  Array
              ) {
                if (opts.authorizeFailedHook.length > 0) {
                  errSrcIsErrHook = true;
                  await opts.authorizeFailedHook[0](
                    ctx,
                    err,
                    result,
                    info,
                    status
                  );
                  return;
                }
              }

              // Error was not handled here, try to handle it in the catch handler.
              throw err;
            } else if (
              opts.authorizeSucceededHook &&
              /* ensure type no-op */ opts.authorizeSucceededHook instanceof
                Array
            ) {
              for (let i = 0; i < opts.authorizeSucceededHook.length; i++) {
                await opts.authorizeSucceededHook[i](ctx, result, info, status);
              }
            }
          } catch (err) {
            // [2] Throw the error if it is not the actual srcErr
            // from passport
            if (errSrcIsErrHook && err !== srcErr) {
              throw err;
            }

            if (
              opts.authorizeFailedHook &&
              /* ensure type no-op */ opts.authorizeFailedHook instanceof Array
            ) {
              if (opts.authorizeFailedHook.length > 1) {
                for (let i = 1; i < opts.authorizeFailedHook.length; i++) {
                  // You can find an explanation on what happens here above at [1]
                  try {
                    await opts.authorizeFailedHook[i](
                      ctx,
                      err,
                      srcResult,
                      srcInfo,
                      srcStatus
                    );
                    return;
                  } catch (intermediateError) {
                    if (err !== intermediateError) {
                      // Something else happend, bubble up.
                      throw intermediateError;
                    }
                  }
                }
              }
            }

            // Something was not handled, bubble up.
            throw err;
          }
        }

        // Call the postAuthorizeHooks if present. If something is
        // thrown in them, it will instantly bubble up to the global
        // koa handler.
        if (
          opts.postAuthorizeHook &&
          /* ensure type no-op */ opts.postAuthorizeHook instanceof Array
        ) {
          for (let i = 0; i < opts.postAuthorizeHook.length; i++) {
            await opts.postAuthorizeHook[i](ctx, srcResult, srcInfo, srcStatus);
          }
        }
      },
    ],
  ];
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
class UnableToVerifyError extends customError(
  'UnableToVerifyError',
  'state_is_required'
) {}
class InvalidStateError extends customError(
  'InvalidStateError',
  'state_mismatch'
) {}

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
    return callback(new UnableToVerifyError(), false, {
      message: 'Unable to verify authorization request state.',
    });
  }

  req.cookies.set(this.key, '', {
    httpOnly: false,
    expires: removeDays(new Date(), 1),
  });

  if (state !== providedState) {
    return callback(new InvalidStateError(), false, {
      message: 'Invalid authorization request state.',
    });
  }

  callback(null, true);
};

export type DeserializedData = {
  _user: {
    id: string,
    name: string,
    email: string,
    avatarUrl: string,
  },
  _team: {
    id: string,
    name: string,
    avatarUrl: string,
  },
};

export type DeserializeTokenFn = (
  accessToken: string,
  refreshToken: string
) => Promise<DeserializedData> | DeserializedData;

type AuthorizationResult = DeserializedData & {
  user: User,
  isNewUser: boolean,
  team: Team,
  isNewTeam: boolean,
};

// eslint-disable-next-line prettier/prettier
export type OAuth2PassportOptions = NativePassportOptions<AuthorizationResult> & {
  clientID: string,
  clientSecret: string,
  tokenURL: string,
  authorizationURL: string,
  callbackURL?: string,
  scope?: string[],
  customHeaders?: { [x: string]: any },
  scopeSeparator?: string,
  state?: string,
  column: 'slackId' | 'googleId',
};

const Op = Sequelize.Op;
const columns = {};
export function mountOAuth2Passport(
  service: string,
  deserializeToken: DeserializeTokenFn,
  opts: OAuth2PassportOptions
) {
  // check if there are possible id-conflicts
  const conflict = columns[opts.column];
  if (conflict) {
    const message = `
      The authentication provider ${service} is configured to use column ${
      opts.column
    }.
      Authentication provider ${conflict} is also configured to use column ${
      opts.column
    }, which may
      result in security vulnerabilites due to conflicts.
    `;
    if (process.env.STRICT_COLUMN_CONFLICT_CHECKS) {
      console.error(message);
    } else {
      console.log(`WARNING: ${message}`);
    }
  } else {
    columns[service] = opts.column;
  }

  // ensure that opts.xxxHook are actually arrays
  if (opts.preAuthorizeHook && !(opts.preAuthorizeHook instanceof Array)) {
    opts.preAuthorizeHook = [opts.preAuthorizeHook];
  }
  if (opts.postAuthorizeHook && !(opts.postAuthorizeHook instanceof Array)) {
    opts.postAuthorizeHook = [opts.postAuthorizeHook];
  }
  if (
    opts.authorizeSucceededHook &&
    !(opts.authorizeSucceededHook instanceof Array)
  ) {
    opts.authorizeSucceededHook = [opts.authorizeSucceededHook];
  }
  if (
    opts.authorizeFailedHook &&
    !(opts.authorizeFailedHook instanceof Array)
  ) {
    opts.authorizeFailedHook = [opts.authorizeFailedHook];
  }

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

  // Called when succeeded. Use it to get access to the ctx object.
  async function postAuthorizeHook(
    ctx: Context,
    result: ?AuthorizationResult,
    info: ?string,
    status: ?string
  ) {
    if (result && result.user && result.team && result.isNewUser) {
      await Event.create({
        name: 'users.create',
        actorId: result.user.id,
        userId: result.user.id,
        teamId: result.team.id,
        data: {
          name: result.user.name,
          service: service,
        },
        ip: ctx.ip,
      });
    }
  }

  // Called when authorization succeeded, the tokens were deserialized and the database
  // entries were written
  async function authorizeSucceededHook(
    ctx: Context,
    result: AuthorizationResult,
    info: string,
    status: string
  ) {
    ctx.signIn(result.user, result.team, service, result.isNewUser);
  }

  // Called when authorization failed
  async function authorizeFailedHook(
    ctx: Context,
    err: any,
    result: ?AuthorizationResult,
    info: ?string,
    status: ?string
  ) {
    switch (true) {
      case err instanceof UnableToVerifyError:
      case err instanceof InvalidStateError:
        ctx.redirect(`/?notice=auth-error&error=${err.message}`);
        return;

      case err instanceof Sequelize.UniqueConstraintError:
        if (result && result.user && result.team) {
          const exists = await User.findOne({
            where: {
              service: 'email',
              email: result.user.email,
              teamId: result.team.id,
            },
          });

          if (exists) {
            ctx.redirect(`${result.team.url}?notice=email-auth-required`);
          } else {
            ctx.redirect(`${result.team.url}?notice=auth-error`);
          }

          return;
        }
        break;
      default:
        break;
    }
    // will bubble through passport and maybe to the koa stack handler
    throw err;
  }

  // Called by passport.js when accessToken and refreshToken were obtained
  async function importUser(
    accessToken: string,
    refreshToken: string,
    _: any,
    done: (err: ?Error, result: AuthorizationResult) => void
  ) {
    let err: ?Error;
    let data: AuthorizationResult = {
      user: null,
      team: null,
      isNewUser: false,
      isNewTeam: false,

      // $FlowIssue
      _user: {},

      // $FlowIssue
      _team: {},
    };
    try {
      data = {
        ...data,
        ...(await deserializeToken(accessToken, refreshToken)),
      };

      const [team, isNewTeam] = await Team.findOrCreate({
        where: {
          [opts.column || 'slackId']: data._team.id,
        },
        defaults: {
          name: data._team.name,
          avatarUrl: data._team.avatarUrl,
        },
      });
      data = { ...data, team, isNewTeam };

      const [user, isNewUser] = await User.findOrCreate({
        where: {
          [Op.or]: [
            {
              service: service,
              serviceId: data._user.id,
            },
            {
              service: { [Op.eq]: null },
              email: data._user.email,
            },
          ],
          teamId: team.id,
        },
        defaults: {
          service: service,
          serviceId: data._user.id,
          name: data._user.name,
          email: data._user.email,
          isAdmin: isNewTeam,
          avatarUrl: data._user.avatarUrl,
        },
      });
      data = { ...data, user, isNewUser };

      // update the user with fresh details if they just accepted an invite
      if (!user.serviceId || !user.service) {
        await user.update({
          service: service,
          serviceId: data._user.id,
          avatarUrl: data._user.avatarUrl,
        });
      }

      // update email address if it's changed
      if (!isNewUser && data._user.email !== user.email) {
        await user.update({ email: data._user.email });
      }

      if (isNewTeam) {
        await team.provisionFirstCollection(user.id);
        await team.provisionSubdomain(team.domain);
      }
    } catch (caughtError) {
      err = caughtError;
    }

    return done(err, data);
  }

  const strategy = new OAuth2Strategy(
    {
      clientID: opts.clientID,
      clientSecret: opts.clientSecret,
      tokenURL: opts.tokenURL,
      authorizationURL: opts.authorizationURL,
      callbackURL:
        opts.callbackURL || `${process.env.URL || ''}/auth/${service}.callback`,
      state: true,
      store: new StateStore({ key: opts.state || 'state' }),
      customHeaders: opts.customHeaders,
      scope: opts.scope,
      scopeSeparator: opts.scopeSeparator,
    },
    importUser
  );

  return mountNativePassport(service, strategy, {
    authorizeRequest: true,
    preAuthorizeHook: [...(opts.preAuthorizeHook || []), preAuthorizeHook],
    postAuthorizeHook: [postAuthorizeHook, ...(opts.postAuthorizeHook || [])],
    authorizeSucceededHook: [
      authorizeSucceededHook,
      ...(opts.authorizeSucceededHook || []),
    ],
    authorizeFailedHook: [
      authorizeFailedHook,
      ...(opts.authorizeFailedHook || []),
    ],
  });
}
