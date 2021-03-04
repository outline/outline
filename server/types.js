// @flow
import { type Context } from "koa";
import { User, Team } from "./models";

export type ContextWithState = {|
  ...$Exact<Context>,
  state: {
    user: User,
    token: string,
    authType: "app" | "api",
  },
|};

export type ContextWithAuthMiddleware = {|
  ...$Exact<ContextWithState>,
  signIn: (
    user: User,
    team: Team,
    providerName: string,
    isFirstSignin: boolean
  ) => void,
|};
