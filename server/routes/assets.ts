import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
  const lng = languages.find((language) => language === ctx.params.lng);

  if (!lng) {
    ctx.status = 404;
    return;
  }

  const locale = await loadClientLocale(lng);

  ctx.set("Cache-Control", `public, max-age=${7 * Day.seconds}`);
  ctx.set("ETag", locale.etag);
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.type = "application/json";
  ctx.status = 200;

  if (ctx.fresh) {
    ctx.status = 304;
    return;
  }

  ctx.body = locale.body;
});

type Language = (typeof languages)[number];

interface ClientLocale {
  body: string;
  etag: string;
}

const clientLocales = new Map<Language, ClientLocale>();

/**
 * Loads a translation file for the client, without the entries that match
 * their key. The client shows the key when an entry is missing, so the result
 * does not change.
 *
 * @param lng A supported language in CLDR format (en_US).
 * @returns the JSON body and its ETag.
 */
async function loadClientLocale(lng: Language): Promise<ClientLocale> {
  const cached = clientLocales.get(lng);
  if (cached) {
    return cached;
  }

  const file = path.join(
    __dirname,
    "../../shared/i18n/locales",
    lng,
    "translation.json"
  );
  const translations: Record<string, string> = JSON.parse(
    await readFile(file, "utf8")
  );
  const body = JSON.stringify(
    Object.fromEntries(
      Object.entries(translations).filter(([key, value]) => key !== value)
    )
  );
  const locale = {
    body,
    etag: `"${crypto.createHash("md5").update(body).digest("hex")}"`,
  };

  clientLocales.set(lng, locale);
  return locale;
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && "status" in err && err.status === 404;
}

export default router;
