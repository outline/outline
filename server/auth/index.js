// @flow
import bodyParser from "koa-bodyparser";
import Koa from "koa";
import Router from "koa-router";
import addMonths from "date-fns/add_months";
import validation from "../middlewares/validation";
import auth from "../middlewares/authentication";
import { getCookieDomain } from "../utils/domains";
import { Team } from "../models";

import slack from "./slack";
import google from "./google";
import email from "./email";

const app = new Koa();
const router = new Router();

router.use("/", slack.routes());
router.use("/", google.routes());
router.use("/", email.routes());

router.get("/redirect", auth(), async ctx => {
  const user = ctx.state.user;

  // transfer access token cookie from root to subdomain
  const rootToken = ctx.cookies.get("accessToken");
  const jwtToken = user.getJwtToken();

  if (rootToken === jwtToken) {
    ctx.cookies.set("accessToken", undefined, {
      httpOnly: true,
      domain: getCookieDomain(ctx.request.hostname),
    });

    ctx.cookies.set("accessToken", jwtToken, {
      httpOnly: false,
      expires: addMonths(new Date(), 3),
    });
  }

  const team = await Team.findByPk(user.teamId);
  ctx.redirect(`${team.url}/home`);
});

app.use(bodyParser());
app.use(validation());
app.use(router.routes());

export default app;
