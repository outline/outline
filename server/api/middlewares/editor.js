// @flow
import { type Context } from 'koa';
import pkg from 'rich-markdown-editor/package.json';

export default function editor() {
  return async function editorMiddleware(ctx: Context, next: () => Promise<*>) {
    if (ctx.headers['x-editor-version'] !== pkg.version) {
      ctx.body = {
        error: 'editor_update_required',
        message: 'The client editor is out of date and must be reloaded',
        status: 400,
        ok: false,
      };
      return;
    }
    return next();
  };
}
