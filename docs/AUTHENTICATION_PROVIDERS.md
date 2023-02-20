# Authentication Providers

A new auth provider can be added with the addition of a plugin with a koa router
as the default export in /server/auth/[provider].ts and (optionally) a matching
logo in `/client/Icon.tsx` that will appear on the sign-in button.

Auth providers generally use [Passport](http://www.passportjs.org/) strategies,
although they can use any custom logic if needed. See the `google` auth provider
for the cleanest example of what is required – some rules:

- The strategy name _must_ be lowercase
- The strategy _must_ call the `accountProvisioner` command in the verify callback
- The auth file _must_ export a `config` object with `name` and `enabled` keys
- The auth file _must_ have a default export with a koa-router
