// @flow
import _ from 'lodash';
import { User, Document } from '../models';
import presentUser from './user';
import presentCollection from './collection';

type Options = {
  includeCollaborators?: boolean,
};

async function present(ctx: Object, document: Document, options: ?Options) {
  options = {
    includeCollaborators: true,
    ...options,
  };
  ctx.cache.set(document.id, document);

  // For empty document content, return the title
  if (document.text.trim().length === 0)
    document.text = `# ${document.title || 'Untitled document'}`;

  const data = {
    id: document.id,
    url: document.getUrl(),
    urlId: document.urlId,
    private: document.private,
    title: document.title,
    text: document.text,
    emoji: document.emoji,
    createdAt: document.createdAt,
    createdBy: presentUser(ctx, document.createdBy),
    updatedAt: document.updatedAt,
    updatedBy: presentUser(ctx, document.updatedBy),
    firstViewedAt: undefined,
    lastViewedAt: undefined,
    team: document.teamId,
    collaborators: [],
    starred: !!(document.starred && document.starred.length),
    collectionId: document.atlasId,
    collaboratorCount: undefined,
    collection: undefined,
    views: undefined,
  };

  if (document.private && document.collection) {
    data.collection = await presentCollection(ctx, document.collection);
  }

  if (document.views && document.views.length === 1) {
    data.views = document.views[0].count;
    data.firstViewedAt = document.views[0].createdAt;
    data.lastViewedAt = document.views[0].updatedAt;
  }

  if (options.includeCollaborators) {
    // This could be further optimized by using ctx.cache
    data.collaborators = await User.findAll({
      where: {
        id: { $in: _.takeRight(document.collaboratorIds, 10) || [] },
      },
    }).map(user => presentUser(ctx, user));

    data.collaboratorCount = document.collaboratorIds.length;
  }

  return data;
}

export default present;
