// @flow
import { Star, User, Document, View } from '../models';
import presentUser from './user';
import presentCollection from './collection';

async function present(ctx: Object, document: Document, options: Object = {}) {
  options = {
    includeCollection: true,
    includeCollaborators: true,
    includeViews: true,
    ...options,
  };
  ctx.cache.set(document.id, document);
  const data = {
    id: document.id,
    url: document.getUrl(),
    private: document.private,
    title: document.title,
    text: document.text,
    html: document.html,
    preview: document.preview,
    collection: presentCollection(ctx, document.collection),
    createdAt: document.createdAt,
    createdBy: presentUser(ctx, document.createdBy),
    updatedAt: document.updatedAt,
    updatedBy: presentUser(ctx, document.updatedBy),
    team: document.teamId,
    collaborators: [],
    starred: !!document.starred,
    views: undefined,
  };

  if (options.includeViews) {
    data.views = await View.sum('count', {
      where: { documentId: document.id },
    });
  }

  if (options.includeCollaborators) {
    // This could be further optimized by using ctx.cache
    data.collaborators = await User.findAll({
      where: {
        id: {
          $in: document.collaboratorIds || [],
        },
      },
    }).map(user => presentUser(ctx, user));
  }

  return data;
}

export default present;
