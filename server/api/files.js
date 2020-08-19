// @flow
import mammoth from "mammoth";
import Router from "koa-router";
import TurndownService from "turndown";
import auth from "../middlewares/authentication";

const router = new Router();
const turndownService = new TurndownService();

router.post("files.docx.import", auth(), async (ctx) => {
  const file = Object.values(ctx.request.files)[0];
  const { name, path, type } = file;

  const { value } = await mammoth.convertToHtml({ path });
  const markdown = turndownService.turndown(value);

  ctx.body = { markdown };
});

export default router;
