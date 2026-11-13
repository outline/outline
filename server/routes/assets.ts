import crypto from "node:crypto";
import path from "node:path";
import { formatRFC7231 } from "date-fns";
import Router from "@koa/router";
import { send } from "@koa/send";
import { languages } from "@shared/i18n";
import { Day } from "@shared/utils/time";
import env from "@server/env";
import { NotFoundError } from "@server/errors";

const router = new Router();

router.get(
  ["/images/{*path}", "/email/{*path}", "/fonts/{*path}"],
  async (ctx, next) => {
    let sent;

    try {
      sent = await send(ctx, ctx.path, {
        root: path.resolve(__dirname, "../../../public"),
        // 7 day expiry, these assets are mostly static but do not contain a hash
        maxAge: Day.ms * 7,
        setHeaders: (res) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
        },
      });
    } catch (err) {
      if (!isNotFound(err)) {
        throw err;
      }
    }

    if (!sent) {
      await next();
    }
  }
);

if (env.isProduction) {
  router.get("/static/{*path}", async (ctx) => {
    try {
      const pathname = ctx.path.substring(8);
      if (!pathname) {
        throw NotFoundError();
      }

      await send(ctx, pathname, {
        root: path.join(__dirname, "../../app/"),
        // Hashed static assets get 1 year expiry plus immutable flag
        maxAge: Day.ms * 365,
        immutable: true,
        setHeaders: (res, filePath) => {
          res.setHeader("Service-Worker-Allowed", "/");
          res.setHeader("Access-Control-Allow-Origin", "*");

          // The service worker is not hashed and must always be revalidated
          // so that browsers detect and install new versions.
          if (path.basename(filePath) === "sw.js") {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      });
    } catch (err) {
      // Serve a bad request instead of not found if the file doesn't exist,
      // this prevents CDNs from caching the response and allows them to
      // continue serving old file versions.
      if (isNotFound(err)) {
        ctx.status = 400;
        return;
      }

      throw err;
    }
  });
}

router.get("/locales/:lng.json", async (ctx) => {
  const { lng } = ctx.params;

  if (!languages.includes(lng as (typeof languages)[number])) {
    ctx.status = 404;
    return;
  }

  await send(ctx, path.join(lng, "translation.json"), {
    setHeaders: (res, _, stats) => {
      res.setHeader("Last-Modified", formatRFC7231(stats.mtime));
      res.setHeader("Cache-Control", `public, max-age=${7 * Day.seconds}`);
      res.setHeader(
        "ETag",
        crypto.createHash("md5").update(stats.mtime.toISOString()).digest("hex")
      );
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
    root: path.join(__dirname, "../../shared/i18n/locales"),
  });
});

function isNotFound(err: unknown): boolean {
  return err instanceof Error && "status" in err && err.status === 404;
}

export default router;
