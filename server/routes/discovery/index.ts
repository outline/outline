import Router from "koa-router";
import { Day } from "@shared/utils/time";
import { opensearchResponse } from "./opensearch";
import { robotsResponse } from "./robots";
import mcp from "./mcp";

const router = new Router();

router.get("/robots.txt", (ctx) => {
  ctx.body = robotsResponse();
});

router.get("/opensearch.xml", (ctx) => {
  ctx.type = "text/xml";
  ctx.response.set("Cache-Control", `public, max-age=${7 * Day.seconds}`);
  ctx.body = opensearchResponse(ctx.request.URL.origin);
});

router.use(mcp.routes());

export default router;
