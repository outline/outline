// @flow
import { Collection, Star, User, View, Document } from '../models';
import presentUser from './user';
import presentCollection from './collection';
import _ from 'lodash';

type Options = {
  includeCollection?: boolean,
  includeCollaborators?: boolean,
  includeViews?: boolean,
};

async function present(ctx: Object, document: Document, options: Options) {
  options = {
    includeCollection: true,
    includeCollaborators: true,
    includeViews: true,
    ...options,
  };
  ctx.cache.set(document.id, document);

  const userId = ctx.state.user.id;
  let data = {
    id: document.id,
    url: document.getUrl(),
    private: document.private,
    title: document.title,
    text: document.text,
    html: document.html,
    preview: document.preview,
    createdAt: document.createdAt,
    createdBy: undefined,
    starred: false,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    team: document.teamId,
    collaborators: [],
  };

  data.starred = !!await Star.findOne({
    where: { documentId: document.id, userId },
  });

  if (options.includeViews) {
    // $FlowIssue not found in object literal?
    data.views = await View.sum('count', {
      where: { documentId: document.id },
    });
  }

  if (options.includeCollection) {
    // $FlowIssue not found in object literal?
    data.collection = await ctx.cache.get(document.atlasId, async () => {
      const collection =
        options.collection ||
        (await Collection.findOne({
          where: {
            id: document.atlasId,
          },
        }));
      return presentCollection(ctx, collection);
    });
  }

  if (options.includeCollaborators) {
    // This could be further optimized by using ctx.cache
    data['collaborators'] = await User.findAll({
      where: {
        id: {
          $in: _.takeRight(document.collaboratorIds, 10) || [],
        },
      },
    }).map(user => presentUser(ctx, user));
    // $FlowIssue not found in object literal?
    data.collaboratorCount = document.collaboratorIds.length;
  }

  const createdBy = await ctx.cache.get(
    document.createdById,
    async () => await User.findById(document.createdById)
  );
  data.createdBy = await presentUser(ctx, createdBy);

  const updatedBy = await ctx.cache.get(
    document.lastModifiedById,
    async () => await User.findById(document.lastModifiedById)
  );
  data.updatedBy = await presentUser(ctx, updatedBy);

  return data;
}

export default present;
