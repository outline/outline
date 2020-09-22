// @flow
import { type Context } from "koa";
import { User } from "./models";

export type ContextWithState = {|
  ...$Exact<Context>,
  state: {
    user: User,
    token: string,
    authType: "app" | "api",
  },
|};
