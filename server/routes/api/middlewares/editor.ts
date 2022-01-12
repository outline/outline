import { Context, Next } from "koa";
import semver from "semver";
import EDITOR_VERSION from "@shared/editor/version";
import { EditorUpdateError } from "@server/errors";

export default function editor() {
  return async function editorMiddleware(ctx: Context, next: Next) {
    const clientVersion = ctx.headers["x-editor-version"];

    // If the editor version on the client is behind the current version being
    // served in production by either a minor (new features), or major (breaking
    // changes) then force a client reload.
    if (clientVersion) {
      const parsedClientVersion = semver.parse(clientVersion as string);
      const parsedCurrentVersion = semver.parse(EDITOR_VERSION);

      if (
        parsedClientVersion &&
        parsedCurrentVersion &&
        (parsedClientVersion.major < parsedCurrentVersion.major ||
          parsedClientVersion.minor < parsedCurrentVersion.minor)
      ) {
        throw EditorUpdateError();
      }
    }

    return next();
  };
}
