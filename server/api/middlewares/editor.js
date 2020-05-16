// @flow
import { type Context } from 'koa';
import pkg from 'rich-markdown-editor/package.json';
import { EditorUpdateError } from '../../errors';

export default function editor() {
  return async function editorMiddleware(ctx: Context, next: () => Promise<*>) {
    const editorVersion = ctx.headers['x-editor-version'];

    // As the client can only ever be behind the server there's no need for a
    // more strict check of version infront/behind here
    if (editorVersion && editorVersion !== pkg.version) {
      throw new EditorUpdateError();
    }
    return next();
  };
}
