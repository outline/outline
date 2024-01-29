import Router from "koa-router";

const router = new Router();

router.post("/test/error", (ctx) => ctx.throw(Error()));

export default router;
