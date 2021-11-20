import { Context } from "koa";
import pkg from "rich-markdown-editor/package.json";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'semv... Remove this comment to see the full error message
import semver from "semver";
import { EditorUpdateError } from "@server/errors";

export default function editor() {
  return async function editorMiddleware(
    ctx: Context,
    next: () => Promise<any>
  ) {
    const clientVersion = ctx.headers["x-editor-version"];

    // If the editor version on the client is behind the current version being
    // served in production by either a minor (new features), or major (breaking
    // changes) then force a client reload.
    if (clientVersion) {
      const parsedClientVersion = semver.parse(clientVersion);
      const parsedCurrentVersion = semver.parse(pkg.version);

      if (
        parsedClientVersion.major < parsedCurrentVersion.major ||
        parsedClientVersion.minor < parsedCurrentVersion.minor
      ) {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        throw new EditorUpdateError();
      }
    }

    return next();
  };
}
