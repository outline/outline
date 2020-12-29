import { Context } from "koa";
import { User } from "./models";

export type ContextWithState = {
  state: {
    user: User,
    token: string,
    authType: "app" | "api"
  }
} & Context;
