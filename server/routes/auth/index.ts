import passport from "@outlinewiki/koa-passport";
import { addMonths } from "date-fns";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { AuthenticationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import coalesceBody from "@server/middlewares/coaleseBody";
import { Collection, Team, View } from "@server/models";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import { AppState, AppContext, APIContext } from "@server/types";

const app = new Koa<AppState, AppContext>();
const router = new Router();

router.use(passport.initialize());

// dynamically load available authentication provider routes
AuthenticationHelper.providers.forEach((provider) => {
  router.use("/", provider.value.router.routes());
});

router.get("/redirect", auth(), async (ctx: APIContext) => {
  const { user } = ctx.state.auth;
  const jwtToken = user.getJwtToken();

  if (jwtToken === ctx.params.token) {
    throw AuthenticationError("Cannot extend token");
  }

  // ensure that the lastActiveAt on user is updated to prevent replay requests
  await user.updateActiveAt(ctx, true);

  ctx.cookies.set("accessToken", jwtToken, {
    sameSite: "lax",
    expires: addMonths(new Date(), 3),
  });
  const [team, collection, view] = await Promise.all([
    Team.findByPk(user.teamId),
    Collection.findFirstCollectionForUser(user),
    View.findOne({
      where: {
        userId: user.id,
      },
    }),
  ]);

  const defaultCollectionId = team?.defaultCollectionId;

  if (defaultCollectionId) {
    const collection = await Collection.findOne({
      where: {
        id: defaultCollectionId,
        teamId: team.id,
      },
    });

    if (collection) {
      ctx.redirect(`${team.url}${collection.url}`);
      return;
    }
  }

  const hasViewedDocuments = !!view;

  ctx.redirect(
    !hasViewedDocuments && collection
      ? `${team?.url}${collection.url}`
      : `${team?.url}/home`
  );
});

app.use(bodyParser());
app.use(coalesceBody());
app.use(router.routes());

export default app;
