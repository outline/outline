import passport from "@outlinewiki/koa-passport";
import { addMonths } from "date-fns";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { AuthenticationError } from "@server/errors";
import authMiddleware from "@server/middlewares/authentication";
import coalesceBody from "@server/middlewares/coaleseBody";
import { Collection, Team, View } from "@server/models";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import type { AppState, AppContext, APIContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { verifyCSRFToken } from "@server/middlewares/csrf";
import { getJWTPayload } from "@server/utils/jwt";

const app = new Koa<AppState, AppContext>();
const router = new Router();

router.use(passport.initialize());

// dynamically register available authentication provider routes
void (async () => {
  for (const provider of AuthenticationHelper.providers) {
    const resolvedRouter = await provider.value.router;
    if (resolvedRouter) {
      router.use(
        "/",
        authMiddleware({ optional: true }),
        resolvedRouter.routes()
      );
    }
  }
})();

router.get(
  "/redirect",
  authMiddleware({ type: AuthenticationType.APP }),
  async (ctx: APIContext) => {
    const { user, service } = ctx.state.auth;

    const payload = getJWTPayload(ctx.state.auth.token);
    if (payload.type !== "transfer") {
      throw AuthenticationError("Cannot extend token");
    }

    const jwtToken = user.getJwtToken(undefined, service);

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
        ctx.redirect(`${team.url}${collection.path}`);
        return;
      }
    }

    const hasViewedDocuments = !!view;

    ctx.redirect(
      !hasViewedDocuments && collection
        ? `${team?.url}${collection.path}/recent`
        : `${team?.url}/home`
    );
  }
);

app.use(bodyParser());
app.use(coalesceBody());
app.use(verifyCSRFToken());
app.use(router.routes());

export default app;
