import passport, { Profile } from "@outlinewiki/koa-passport";
import Router from "koa-router";
import { Strategy as GithubStrategy } from "passport-github2";
import accountProvisioner from "@server/commands/accountProvisioner";
import env from "@server/env";
import passportMiddleware from "@server/middlewares/passport";
import { StateStore } from "@server/utils/passport";
import { AuthenticationResult } from "@server/types";
import {User} from "@server/models";
import {request} from "@server/utils/passport"

const router = new Router();
const providerName = "github";

const scopes = ["read:org", "user:email"];

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET){ 

    passport.use (new GithubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_ID,
        callbackURL: `${env.URL}/auth/github.callback`,
        passReqToCallback: true,
		// @ts-expect-error StateStore
        store: new StateStore(),
        scope: scopes,
      },
	  function(accessToken: string, refreshToken: string, profile: Profile, done: (
		err: Error | null,
		user: User | null,
		result?: AuthenticationResult
	  ) => void) {
		const name = profile.displayName
		const username = profile.name
		console.log(name)
		console.log(username)
	  }))
    router.get("github", passport.authenticate(providerName));
  }
  router.get("github.callback", passportMiddleware(providerName));

export default router;
