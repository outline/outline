// @flow
import fs from "fs";
import Router from "koa-router";
import mammoth from "mammoth";
import TurndownService from "turndown";
import auth from "../middlewares/authentication";

const router = new Router();
const turndownService = new TurndownService();

interface FiletypeSupporter {
  extension: string | string[];
  type: string;
  getMarkdown: FileToMarkdown;
}

const allSupportedFiles: FiletypeSupporter[] = [
  {
    extension: ".docx",
    type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    getMarkdown: getDocxMardown,
  },
  {
    extension: [".htm", ".html"],
    type: "text/html",
    getMarkdown: getHtmlMardown,
  },
];

router.post("files.support", async (ctx) => {
  ctx.body = {
    types: allSupportedFiles.map((t) => t.type),
  };
});

router.post("files.import", auth(), async (ctx) => {
  const file = Object.values(ctx.request.files)[0];
  const { path, type } = file;

  const fileInfo = allSupportedFiles.find((t) => t.type === type);

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
