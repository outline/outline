import {
  closeSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
} from "fs";
import path from "path";
import Router from "koa-router";
import mime from "mime-types";
import { bytesToHumanReadable } from "@shared/utils/files";
import env from "@server/env";
import {
  AuthenticationError,
  InvalidRequestError,
  NotFoundError,
} from "@server/errors";
import auth from "@server/middlewares/authentication";
import { Attachment } from "@server/models";
import { authorize } from "@server/policies";
import { APIContext } from "@server/types";
import { getAttachmentForJWT } from "@server/utils/jwt";
import { getFileFromRequest } from "@server/utils/koa";
import { assertPresent, validateKey } from "@server/validation";

const router = new Router();

router.post("files.create", auth(), async (ctx: APIContext) => {
  if (!ctx.is("multipart/form-data")) {
    throw InvalidRequestError("Request type must be multipart/form-data");
  }
  const { key } = ctx.request.body;
  validateKey(key);
  const file = getFileFromRequest(ctx.request);
  if (!file) {
    throw InvalidRequestError("Request must include a file parameter");
  }
  if (
    env.FILE_STORAGE_UPLOAD_MAX_SIZE &&
    file.size > env.FILE_STORAGE_UPLOAD_MAX_SIZE
  ) {
    throw InvalidRequestError(
      `The selected file was larger than the ${bytesToHumanReadable(
        env.FILE_STORAGE_UPLOAD_MAX_SIZE
      )} maximum size`
    );
  }

  const subdir = key.split("/").slice(0, -1).join("/");
  if (!existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT, subdir))) {
    mkdirSync(path.join(env.FILE_STORAGE_LOCAL_ROOT, subdir), {
      recursive: true,
    });
  }

  const src = createReadStream(file.filepath);
  const destPath = path.join(env.FILE_STORAGE_LOCAL_ROOT, key);
  closeSync(openSync(destPath, "w"));
  const dest = createWriteStream(destPath);
  src.pipe(dest);

  ctx.body = {
    success: true,
  };
});

router.get("files.get", auth({ optional: true }), async (ctx: APIContext) => {
  const key = ctx.request.query.key as string | undefined;
  const sig = ctx.request.query.sig as string | undefined;
  const actor = ctx.state.auth.user;
  let attachment: Attachment | null;
  if (key) {
    validateKey(key);
    const id = key.split("/")[2];
    attachment = await Attachment.findByPk(id, { rejectOnEmpty: true });
  } else {
    assertPresent(sig, "sig is required");
    attachment = await getAttachmentForJWT(sig!);
  }

  if (!attachment) {
    throw NotFoundError("File doesn't exist");
  }

  if (attachment.isPrivate) {
    if (!actor) {
      throw AuthenticationError();
    }
    authorize(actor, "read", attachment);
  }

  const fileName = attachment.key.split("/")[3];
  const contentType = mime.lookup(fileName) || "application/octet-stream";
  ctx.set("Content-Type", contentType);
  ctx.attachment(fileName);
  ctx.body = attachment.stream;
});

export default router;
