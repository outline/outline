import passport, { Profile } from "@outlinewiki/koa-passport";
import Router from "koa-router";
import { Strategy as GithubStrategy } from "passport-github2";
import accountProvisioner from "@server/commands/accountProvisioner";
import env from "@server/env";
import passportMiddleware from "@server/middlewares/passport";
import { AuthenticationResult } from "@server/types";
import {User} from "@server/models";
const router = new Router();
const providerName = "github";

const scopes = ["read:org", "user:email"];

type GitHubProfile = Profile & {
		emails: {
			value: string
		}[]
	};

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET){ 

	passport.use (new GithubStrategy(
	  {
		clientID: env.GITHUB_CLIENT_ID,
		clientSecret: env.GITHUB_CLIENT_SECRET,
		callbackURL: `${env.URL}/auth/github.callback`,
		scope: scopes
	  },
	  async function(accessToken: string, refreshToken: string, profile: GitHubProfile, done: (
		err: Error | null,
		user: User | null,
		result?: AuthenticationResult
	  ) => void) {
		console.log(profile)		
	  }))
	router.get("github", passport.authenticate(providerName));
  }
  router.get("github.callback", passportMiddleware(providerName));

export default router;
