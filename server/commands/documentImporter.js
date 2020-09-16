// @flow
import fs from "fs";
import mammoth from "mammoth";
import TurndownService from "turndown";
import uuid from "uuid";
import { Attachment, Event, User } from "../models";
import dataURItoBuffer from "../utils/dataURItoBuffer";
import parseImages from "../utils/parseImages";
import { uploadToS3FromBuffer } from "../utils/s3";

// https://github.com/domchristie/turndown#options
const turndownService = new TurndownService({
  hr: "---",
  bulletListMarker: "-",
});

type FileToMarkdown = (filePath: string) => Promise<string>;

interface ImportableFile {
  type: string;
  getMarkdown: FileToMarkdown;
}

const importMapping: ImportableFile[] = [
  {
    type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    getMarkdown: getDocxMarkdown,
  },
  {
    type: "text/html",
    getMarkdown: getHtmlMarkdown,
  },
];

async function getDocxMarkdown(filePath: string): Promise<string> {
  const { value } = await mammoth.convertToHtml({ path: filePath });
  return turndownService.turndown(value);
}

async function getHtmlMarkdown(filePath: string): Promise<string> {
  const value = await fs.promises.readFile(filePath, "utf8");
  return turndownService.turndown(value);
}

export default async function documentImporter({
  file,
  user,
  ip,
}: {
  user: User,
  file: any,
  ip: string,
}): Promise<string> {
  const { path, type } = file;

  const fileInfo = importMapping.filter((item) => item.type === type)[0];
  let text = await fileInfo.getMarkdown(path);

  // find data urls, convert to blobs, upload and write attachments
  const images = parseImages(text);
  const dataURIs = images.filter((href) => href.startsWith("data:"));

  for (const uri of dataURIs) {
    const name = "imported";
    const key = `uploads/${user.id}/${uuid.v4()}/${name}`;
    const acl = process.env.AWS_S3_ACL || "private";
    const { buffer, type } = dataURItoBuffer(uri);
    const url = await uploadToS3FromBuffer(buffer, type, key, acl);

    const attachment = await Attachment.create({
      key,
      acl,
      url,
      size: buffer.length,
      contentType: type,
      teamId: user.teamId,
      userId: user.id,
    });

    await Event.create({
      name: "attachments.create",
      data: { name },
      teamId: user.teamId,
      userId: user.id,
      ip,
    });

    text = text.replace(uri, `/api/attachments.redirect?id=${attachment.id}`);
  }

  return text;
}
