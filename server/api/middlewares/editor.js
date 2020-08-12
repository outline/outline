// @flow
import { type Context } from "koa";
import pkg from "rich-markdown-editor/package.json";
import semver from "semver";
import { EditorUpdateError } from "../../errors";

export default function editor() {
  return async function editorMiddleware(ctx: Context, next: () => Promise<*>) {
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
        throw new EditorUpdateError();
      }
    }
    return next();
  };
}
