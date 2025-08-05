import Router from "koa-router";
import { getUserForEmailSigninToken } from "@server/utils/jwt";
import AuthorizedEmail from "@server/models/AuthorizedEmail";

const router = new Router();

router.get("/email.callback", async (ctx) => {
  const token = ctx.query.token as string;

  if (!token) {
    ctx.throw(400, "Missing token");
  }

  let user;
  try {
    user = await getUserForEmailSigninToken(token);
  } catch (_err) {
    ctx.throw(401, "Invalid or expired token");
  }

  if (!user) {
    ctx.throw(401, "Invalid or expired token");
  }

  // Check if registration is disabled and email whitelist is enforced
  const team = await user.$get("team");
  if (team && !team.emailSigninEnabled) {
    // Check if user's email is in authorized email list
    const authorized = await AuthorizedEmail.findOne({
      where: {
        teamId: team.id,
        email: user?.email?.toLowerCase() ?? "",
      },
    });
    if (!authorized) {
      ctx.throw(403, "Access denied: email not authorized");
    }
  }

  // Set access token cookie
  const jwtToken = user.getJwtToken();
  ctx.cookies.set("accessToken", jwtToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
  });

  // Redirect to team home page
  ctx.redirect(team?.url || "/");
});

export default router;
