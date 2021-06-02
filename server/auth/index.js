// @flow
import passport from "@outlinewiki/koa-passport";
import add from "date-fns/add";
import debug from "debug";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { AuthenticationError } from "../errors";
import auth from "../middlewares/authentication";
import validation from "../middlewares/validation";
import { Team } from "../models";
import providers from "./providers";

const log = debug("server");
const app = new Koa();
const router = new Router();

router.use(passport.initialize());

// dynamically load available authentication provider routes
providers.forEach((provider) => {
  if (provider.enabled) {
    router.use("/", provider.router.routes());
    log(`loaded ${provider.name} auth provider`);
  }
});

router.get("/redirect", auth(), async (ctx) => {
  const user = ctx.state.user;
  const jwtToken = user.getJwtToken();

  if (jwtToken === ctx.params.token) {
    throw new AuthenticationError("Cannot extend token");
  }

  // ensure that the lastActiveAt on user is updated to prevent replay requests
  await user.updateActiveAt(ctx.request.ip, true);

  ctx.cookies.set("accessToken", jwtToken, {
    httpOnly: false,
    expires: add(new Date(), { months: 3 }),
  });

  const team = await Team.findByPk(user.teamId);
  ctx.redirect(`${team.url}/home`);
});

app.use(bodyParser());
app.use(validation());
app.use(router.routes());

export default app;
