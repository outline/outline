// @flow
import fs from "fs";
import File from "formidable/lib/file";
import mammoth from "mammoth";
import TurndownService from "turndown";
import uuid from "uuid";
import parseTitle from "../../shared/utils/parseTitle";
import { InvalidRequestError } from "../errors";
import { Attachment, Event, User } from "../models";
import dataURItoBuffer from "../utils/dataURItoBuffer";
import parseImages from "../utils/parseImages";
import { uploadToS3FromBuffer } from "../utils/s3";

// https://github.com/domchristie/turndown#options
const turndownService = new TurndownService({
  hr: "---",
  bulletListMarker: "-",
  headingStyle: "atx",
});

interface ImportableFile {
  type: string;
  getMarkdown: (file: any) => Promise<string>;
}

const importMapping: ImportableFile[] = [
  {
    type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    getMarkdown: docxToMarkdown,
  },
  {
    type: "text/html",
    getMarkdown: htmlToMarkdown,
  },
  {
    type: "text/plain",
    getMarkdown: fileToMarkdown,
  },
  {
    type: "text/markdown",
    getMarkdown: fileToMarkdown,
  },
];

async function fileToMarkdown(file): Promise<string> {
  return fs.promises.readFile(file.path, "utf8");
}

async function docxToMarkdown(file): Promise<string> {
  const { value } = await mammoth.convertToHtml(file);
  return turndownService.turndown(value);
}

async function htmlToMarkdown(file): Promise<string> {
  const value = await fs.promises.readFile(file.path, "utf8");
  return turndownService.turndown(value);
}

export default async function documentImporter({
  file,
  user,
  ip,
}: {
  user: User,
  file: File,
  ip: string,
}): Promise<{ text: string, title: string }> {
  const fileInfo = importMapping.filter((item) => item.type === file.type)[0];
  if (!fileInfo) {
    throw new InvalidRequestError(`File type ${file.type} not supported`);
  }
  let title = file.name.replace(/\.[^/.]+$/, "");
  let text = await fileInfo.getMarkdown(file);

  // If the first line of the imported text looks like a markdown heading
  // then we can use this as the document title
  if (text.trim().startsWith("# ")) {
    const result = parseTitle(text);
    title = result.title;
    text = text.replace(`# ${title}\n`, "");
  }

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

    text = text.replace(uri, attachment.redirectUrl);
  }

  return { text, title };
}
