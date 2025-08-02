import Router from "koa-router";

const router = new Router();

router.post("/test/error", (ctx) => ctx.throw(500, new Error()));

export default router;
