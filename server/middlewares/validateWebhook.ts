import crypto from "node:crypto";
import type { Next } from "koa";
import type { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";

export default function validateWebhook({
  secretKey,
  getSignatureFromHeader,
}: {
  secretKey: string;
  getSignatureFromHeader: (ctx: APIContext) => string | undefined;
}) {
  return async function validateWebhookMiddleware(ctx: APIContext, next: Next) {
    const { body } = ctx.request;
    const signatureFromHeader = getSignatureFromHeader(ctx);

    if (!signatureFromHeader) {
      ctx.status = 401;
      ctx.body = "Missing signature header";
      return;
    }

    const computedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(JSON.stringify(body))
      .digest("hex");

    if (!safeEqual(computedSignature, signatureFromHeader)) {
      ctx.status = 401;
      ctx.body = "Invalid signature";
      return;
    }

    return next();
  };
}
