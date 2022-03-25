import fs from "fs";
import path from "path";
import { strikethrough, tables } from "joplin-turndown-plugin-gfm";
import { truncate } from "lodash";
import mammoth from "mammoth";
import quotedPrintable from "quoted-printable";
import TurndownService from "turndown";
import utf8 from "utf8";
import { MAX_TITLE_LENGTH } from "@shared/constants";
import parseTitle from "@shared/utils/parseTitle";
import { APM } from "@server/logging/tracing";
import { User } from "@server/models";
import dataURItoBuffer from "@server/utils/dataURItoBuffer";
import { deserializeFilename } from "@server/utils/fs";
import parseImages from "@server/utils/parseImages";
import { FileImportError, InvalidRequestError } from "../errors";
import attachmentCreator from "./attachmentCreator";

// https://github.com/domchristie/turndown#options
const turndownService = new TurndownService({
  hr: "---",
  bulletListMarker: "-",
  headingStyle: "atx",
});

// Use the GitHub-flavored markdown plugin to parse
// strikethoughs and tables
turndownService
  .use(strikethrough)
  .use(tables)
  .addRule("breaks", {
    filter: ["br"],
    replacement: function () {
      return "\n";
    },
  });

interface ImportableFile {
  type: string;
  getMarkdown: (file: any) => Promise<string>;
}

const importMapping: ImportableFile[] = [
  {
    type: "application/msword",
    getMarkdown: confluenceToMarkdown,
  },
  {
    type: "application/octet-stream",
    getMarkdown: docxToMarkdown,
  },
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

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'file' implicitly has an 'any' type.
async function fileToMarkdown(file): Promise<string> {
  return fs.promises.readFile(file.path, "utf8");
}

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'file' implicitly has an 'any' type.
async function docxToMarkdown(file): Promise<string> {
  const { value } = await mammoth.convertToHtml(file);
  return turndownService.turndown(value);
}

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'file' implicitly has an 'any' type.
async function htmlToMarkdown(file): Promise<string> {
  const value = await fs.promises.readFile(file.path, "utf8");
  return turndownService.turndown(value);
}

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'file' implicitly has an 'any' type.
async function confluenceToMarkdown(file): Promise<string> {
  let value = await fs.promises.readFile(file.path, "utf8");

  // We're only supporting the ridiculous output from Confluence here, regular
  // Word documents should call into the docxToMarkdown importer.
  // See: https://jira.atlassian.com/browse/CONFSERVER-38237
  if (!value.includes("Content-Type: multipart/related")) {
    throw FileImportError("Unsupported Word file");
  }

  // get boundary marker
  const boundaryMarker = value.match(/boundary="(.+)"/);

  if (!boundaryMarker) {
    throw FileImportError("Unsupported Word file (No boundary marker)");
  }

  // get content between multipart boundaries
  let boundaryReached = 0;
  const lines = value.split("\n").filter((line) => {
    if (line.includes(boundaryMarker[1])) {
      boundaryReached++;
      return false;
    }

    if (line.startsWith("Content-")) {
      return false;
    }

    // 1 == definition
    // 2 == content
    // 3 == ending
    if (boundaryReached === 2) {
      return true;
    }

    return false;
  });

  if (!lines.length) {
    throw FileImportError("Unsupported Word file (No content found)");
  }

  // Mime attachment is "quoted printable" encoded, must be decoded first
  // https://en.wikipedia.org/wiki/Quoted-printable
  value = utf8.decode(quotedPrintable.decode(lines.join("\n")));

  // If we don't remove the title here it becomes printed in the document
  // body by turndown
  turndownService.remove(["style", "title"]);

  // Now we should have something that looks like HTML
  const html = turndownService.turndown(value);
  return html.replace(/<br>/g, " \\n ");
}

async function documentImporter({
  file,
  user,
  ip,
}: {
  user: User;
  file: File;
  ip: string;
}): Promise<{
  text: string;
  title: string;
}> {
  const fileInfo = importMapping.filter((item) => {
    if (item.type === file.type) {
      if (
        file.type === "application/octet-stream" &&
        path.extname(file.name) !== ".docx"
      ) {
        return false;
      }

      return true;
    }

    if (item.type === "text/markdown" && path.extname(file.name) === ".md") {
      return true;
    }

    return false;
  })[0];

  if (!fileInfo) {
    throw InvalidRequestError(`File type ${file.type} not supported`);
  }

  let title = deserializeFilename(file.name.replace(/\.[^/.]+$/, ""));
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
    const { buffer, type } = dataURItoBuffer(uri);
    const attachment = await attachmentCreator({
      name,
      type,
      buffer,
      user,
      ip,
    });
    text = text.replace(uri, attachment.redirectUrl);
  }

  // It's better to truncate particularly long titles than fail the import
  title = truncate(title, { length: MAX_TITLE_LENGTH });

  return {
    text,
    title,
  };
}

export default APM.traceFunction({
  serviceName: "command",
  spanName: "documentImporter",
})(documentImporter);
