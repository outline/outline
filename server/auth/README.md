# Building custom authentication providers

The authentication is based on the methods exported from `../utils/passport.js`, which wrap around the methods of `passport.js`. There are (currently) 2 ways to add a custom authentication provider. These 2 methods both return an array, consisting of a authorize koa handler and another array of 2 koa handlers to handle the callback routes. Have a look at the existing implementation `./auth` for reference and on how to use them.

**mountNativePassport**: Load a passport.js strategy and implement the import transaction yourself.
```typescript
mountNativePassport<R>(service: string, strategy: any, opts: NativePassportOptions<R>)
```
This is way more difficult and requires a deeper understanding of outlines codebase. You have to create the team and users and emit events accordingly. Only use it if your provider cannot be connected using the second option. For a sample implementation, have a look at the code for the second option, which makes use of `mountNativePassport()`.

**mountOAuth2Passport**: Connect a OAuth2-capable provider which exports some kind of user - team association.
```typescript
mountOAuth2Passport(service: string, deserializeToken: DeserializeTokenFn, opts: OAuth2PassportOptions)
```
At this point, [Google](https://developers.google.com/identity/protocols/oauth2) and [Slack](https://api.slack.com/legacy/oauth) (and [Discord](https://discordapp.com/developers/docs/topics/oauth2)[#729](https://github.com/outline/outline/pull/939#issuecomment-487390892) for testing purposes) are implemented with this method. In theory, [Mattermost](https://docs.mattermost.com/developer/oauth-2-0-applications.html) [#1177](https://github.com/outline/outline/issues/1177), [Mastodon](https://docs.joinmastodon.org/methods/apps/oauth/), [GitHub](https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/) / [GitLab](https://docs.gitlab.com/ee/api/oauth2.html) [#962](https://github.com/outline/outline/issues/962), [Basecamp](https://github.com/basecamp/api/blob/master/sections/authentication.md) and OpenID, LDAP / Active Directory / Microsoft Teams [#755](https://github.com/outline/outline/issues/755) [#1067](https://github.com/outline/outline/pull/1067) can be added with minor effort (this is not a complete list, many more provider expose OAuth2 apis - this list contains the most requested providers for outline). Using this method, the integration code is responsible to retrieve the user and team data and return it in the following format: 
```typescript
type DeserializedData = {
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
}
```
This process is called *deserialization*, because a given token (2 in fact, the `accessToken` and  the `refreshToken`), which represents the serialized format, is deserialized to the data it grants access to. To deserialize, implement a function matching the following signature:
```typescript
type DeserializeTokenFn = (
  accessToken: string,
  refreshToken: string
) => Promise<DeserializedData> | DeserializedData
```
Per OAuth2 process, the client (outline in this case), has to identify itself against the provider. It does that by sending a so called `clientID` and a `clientSecret`. Configure those, the required URLs (`authorizationURL` and `tokenURL`) and the `scope` in the options parameter of `mountOAuth2Passport()`. If you need special query parameters on your urls, include right away. If you need special headers, include them in the `customHeaders` option. **You currently also have to configure which database column you want to use for the team id**. Do that be setting the `column` option to either `slackId` or `googleId` (read more about why below)

### Hooks
`mountNativePassport` supports user-defined functions, which will run at specific points during the authentication process. They can be configured in the options parameter.
Note that `preAuthorizeHook` and `postAuthorizeHook` are not subject to the error handling process described below. Thrown errors there will be caught by the global koa error handler. Keep in mind that this breaks the flow and users will see an error message. Try to use the other hooks to catch errors and redirect.

#### Hooks around `passport.authorize()`
- **preAuthorizeHook**: Are called before `passport.authorize()` is called.
- **postAuthorizeHook**: Are called after all `authorizeSucceededHook` returned successfully.

#### Authentication Hooks
- **authorizeSucceededHook**: Are called after `passport.authorize()` returned without any errors. Throwing an error will stop the execution of all pending `authorizeSucceededHook` and start the error handling in the `authorizeFailedHook`.
- **authorizeFailedHook**: Are called if either `passport.authorize()` returned an error or when one of the `authorizeSucceededHook` threw an error. Read the section about error handling below to understand how to correctly mitigate the error source and handle the error accordingly.

### Error Handling
All hooks are represented by an array containing the hook-functions. `(pre|post)AuthorizeHook` and the `authorizeSucceededHooks` are being executed one-by-one and in order. If one of them throws an error, the executing is stopped and any pending hooks are "canceled" / wont be executed. The errors thrown in `(pre|post)AuthorizeHook` will be handled in the global koa error handler and those from `authorizeSucceededHooks` as well, if not intercepted by a `authorizeFailedHook`. Intercepting an error works as follows: A given error handler can do 2 things. Either handle the error or pass the error on:
```typescript
// @flow
import { type Context } 'koa-router';

// Note that you can use the customError() function to create and throw errors
// in your transactions you can later identify by 'err instanceof YourError'
// in the error handler
import { customError } from '../errors';

class ActionFailedError extends customError("ActionFailedError", "") {}
function handleActionFailedError(ctx: Context, err: any) {
    if (err instanceof ActionFailedError) {
        ctx.redirect('/?notice=action-failed');
        return; // <- this indicates that the error was handled
    }

    throw err; // <- this indicates that the error was not handled
}

class ValidationFailedError extends customError("ValidationFailedError", "") {}
function handleValidationFailedError(ctx: Context, err: any) {
    if (err instanceof ValidationFailedError) {
        ctx.redirect('/?notice=validate-failed');
        return;
    }

    throw err;
}

mountNativePassport("", null, {
    authorizeFailedHook: [handleActionFailedError, handleValidationFailedError],
})
```

### Notes
- Why do I have to choose the database column? The database format it currently limited to 2 types of team-ids: the slackId and the googleId. While the user table can dynamically store any id from a authentication provider by naming the provider, the team table is (currently) not configured for that. This wont be a problem if you have only one or two providers configured. Otherwise there are providers which have to share a column, while outline is unable to identify from which provider the id came from. This behavior is currently deactivated. Set the env variable `STRICT_COLUMN_CONFLICT_CHECKS` (in .env or on the machine) to false to enable this behavior. Note that this behavior will create a few vulnerabilities, such as priviledge escalation by id-conflict.