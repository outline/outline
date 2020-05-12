// @flow
import { type Context } from 'koa';
import pkg from 'rich-markdown-editor/package.json';
import { EditorUpdateError } from '../../errors';

export default function editor() {
  return async function editorMiddleware(ctx: Context, next: () => Promise<*>) {
    if (ctx.headers['x-editor-version'] !== pkg.version) {
      throw new EditorUpdateError();
    }
    return next();
  };
}
