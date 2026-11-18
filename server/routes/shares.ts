import Router from "@koa/router";
import shareDomains from "@server/middlewares/shareDomains";
import { renderShare } from "./app";

const router = new Router();

// Legacy share urls.
router.get(
  [
    "/share/:shareId",
    "/share/:shareId/doc/:documentSlug",
    "/share/:shareId/{*path}",
  ],
  (ctx) => {
    const redirectPath = ctx.path.replace(/^\/share/, "/s");
    ctx.redirect(redirectPath + ctx.request.URL.search);
    ctx.status = 301;
  }
);

router.use(shareDomains());

router.get(
  [
    "/s/:shareId.:format",
    "/s/:shareId",
    "/s/:shareId/doc/:documentSlug.:format",
    "/s/:shareId/doc/:documentSlug",
    "/s/:shareId/{*path}",
  ],
  renderShare
);

// Routes below are only served for a share on its own custom domain.
router.get("/doc/:documentSlug", (ctx, next) => {
  if (ctx.state.rootShare) {
    return renderShare(ctx, next);
  }
  return next();
});

router.get("/sitemap.xml", (ctx) => {
  if (ctx.state.rootShare) {
    ctx.redirect(`/api/shares.sitemap?id=${ctx.state.rootShare.id}`);
  } else {
    ctx.status = 404;
  }
});

router.get("{/*path}", (ctx, next) => {
  if (!ctx.state.rootShare) {
    return next();
  }
  if (ctx.path !== "/") {
    ctx.status = 404;
    return;
  }
  return renderShare(ctx, next);
});

export default router;
