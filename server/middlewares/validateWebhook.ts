import crypto from "crypto";
import type { Next } from "koa";
import type { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";

export default function validateWebhook({
  secretKey,
  getSignatureFromHeader,
  hmacSign = true,
}: {
  secretKey: string;
  getSignatureFromHeader: (ctx: APIContext) => string | undefined;
  hmacSign?: boolean;
}) {
  return async function validateWebhookMiddleware(ctx: APIContext, next: Next) {
    const { body } = ctx.request;
    const signatureFromHeader = getSignatureFromHeader(ctx);

    if (!signatureFromHeader) {
      ctx.status = 401;
      ctx.body = "Missing signature header";
      return;
    }

    const computedSignature = hmacSign
      ? crypto
          .createHmac("sha256", secretKey)
          .update(JSON.stringify(body))
          .digest("hex")
      : secretKey; // GitLab sends the security token as is, without encryption

    if (!safeEqual(computedSignature, signatureFromHeader)) {
      ctx.status = 401;
      ctx.body = "Invalid signature";
      return;
    }

    return next();
  };
}
