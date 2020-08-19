// @flow
import fs from "fs";
import Router from "koa-router";
import mammoth from "mammoth";
import TurndownService from "turndown";
import auth from "../middlewares/authentication";

const router = new Router();
const turndownService = new TurndownService();

interface FiletypeSupporter {
  type: string;
  getMarkdown: FileToMarkdown;
}

const allSupportedFiles: FiletypeSupporter[] = [
  {
    type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    getMarkdown: getDocxMardown,
  },
  {
    type: "text/html",
    getMarkdown: getHtmlMardown,
  },
];

router.post("files.support", async (ctx) => {
  ctx.body = {
    types: allSupportedFiles.map((t: FiletypeSupporter) => t.type),
  };
});

router.post("files.import", auth(), async (ctx) => {
  const file: any = Object.values(ctx.request.files)[0];
  const { path, type } = file;

  const fileInfo: FiletypeSupporter = allSupportedFiles.filter(
    (t: FiletypeSupporter) => t.type === type
  )[0];

  const markdown = await fileInfo.getMarkdown(path);
  ctx.body = { markdown };
});

export default router;

type FileToMarkdown = (filePath: string) => Promise<string>;

async function getDocxMardown(filePath: string): Promise<string> {
  const { value } = await mammoth.convertToHtml({ path: filePath });
  return turndownService.turndown(value);
}

async function getHtmlMardown(filePath: string): Promise<string> {
  const value = await fs.promises.readFile(filePath, "utf8");
  return turndownService.turndown(value);
}
