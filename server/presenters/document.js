// @flow
import _ from 'lodash';
import Sequelize from 'sequelize';
import { User, Document } from '../models';
import presentUser from './user';
import presentCollection from './collection';

const Op = Sequelize.Op;

type Options = {
  isPublic?: boolean,
};

async function present(ctx: Object, document: Document, options: ?Options) {
  options = {
    isPublic: false,
    ...options,
  };
  ctx.cache.set(document.id, document);

  // For empty document content, return the title
  if (!document.text.trim()) {
    document.text = `# ${document.title}`;
  }

  const data = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
    text: document.text,
    emoji: document.emoji,
    createdAt: document.createdAt,
    createdBy: undefined,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    publishedAt: document.publishedAt,
    firstViewedAt: undefined,
    lastViewedAt: undefined,
    team: document.teamId,
    collaborators: [],
    starred: !!(document.starred && document.starred.length),
    revision: document.revisionCount,
    pinned: undefined,
    collectionId: undefined,
    collaboratorCount: undefined,
    collection: undefined,
    views: undefined,
  };

  if (!options.isPublic) {
    data.pinned = !!document.pinnedById;
    data.collectionId = document.collectionId;
    data.createdBy = presentUser(ctx, document.createdBy);
    data.updatedBy = presentUser(ctx, document.updatedBy);

    if (document.collection) {
      data.collection = await presentCollection(ctx, document.collection);
    }

    if (document.views && document.views.length === 1) {
      data.views = document.views[0].count;
      data.firstViewedAt = document.views[0].createdAt;
      data.lastViewedAt = document.views[0].updatedAt;
    }

    // This could be further optimized by using ctx.cache
    data.collaborators = await User.findAll({
      where: {
        id: {
          // $FlowFixMe
          [Op.in]: _.takeRight(document.collaboratorIds, 10) || [],
        },
      },
    }).map(user => presentUser(ctx, user));

    data.collaboratorCount = document.collaboratorIds.length;
  }

  return data;
}

export default present;
