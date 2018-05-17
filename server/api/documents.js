// @flow
import Router from 'koa-router';
import Sequelize from 'sequelize';
import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentDocument, presentRevision } from '../presenters';
import { Document, Collection, Share, Star, View, Revision } from '../models';
import { InvalidRequestError } from '../errors';
import events from '../events';
import policy from '../policies';

const Op = Sequelize.Op;
const { authorize } = policy;
const router = new Router();

router.post('documents.list', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction, collection } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  let where = { teamId: user.teamId };
  if (collection) where = { ...where, atlasId: collection };

  const starredScope = { method: ['withStarred', user.id] };
  const documents = await Document.scope('defaultScope', starredScope).findAll({
    where,
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    documents.map(document => presentDocument(ctx, document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.pinned', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction, collection } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';
  ctx.assertPresent(collection, 'collection is required');

  const user = ctx.state.user;
  const starredScope = { method: ['withStarred', user.id] };
  const documents = await Document.scope('defaultScope', starredScope).findAll({
    where: {
      teamId: user.teamId,
      atlasId: collection,
      pinnedById: {
        // $FlowFixMe
        [Op.ne]: null,
      },
    },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    documents.map(document => presentDocument(ctx, document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.viewed', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const views = await View.findAll({
    where: { userId: user.id },
    order: [[sort, direction]],
    include: [
      {
        model: Document,
        required: true,
        include: [
          {
            model: Star,
            as: 'starred',
            where: { userId: user.id },
            required: false,
          },
        ],
      },
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    views.map(view => presentDocument(ctx, view.document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.starred', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const views = await Star.findAll({
    where: { userId: user.id },
    order: [[sort, direction]],
    include: [
      {
        model: Document,
        include: [{ model: Star, as: 'starred', where: { userId: user.id } }],
      },
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    views.map(view => presentDocument(ctx, view.document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.drafts', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const documents = await Document.findAll({
    // $FlowFixMe
    where: { userId: user.id, publishedAt: { [Op.eq]: null } },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    documents.map(document => presentDocument(ctx, document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.info', auth({ required: false }), async ctx => {
  const { id, shareId } = ctx.body;
  ctx.assertPresent(id || shareId, 'id or shareId is required');

  let document;
  if (shareId) {
    const share = await Share.findById(shareId, {
      include: [
        {
          model: Document,
          required: true,
          as: 'document',
        },
      ],
    });

    // TODO: REMOVE COLLECTION AND COLLABORATOR INFO
    document = share.document;
  } else {
    document = await Document.findById(id);
    authorize(ctx.state.user, 'read', document);
  }

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.revisions', auth(), pagination(), async ctx => {
  let { id, sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';
  ctx.assertPresent(id, 'id is required');
  const document = await Document.findById(id);

  authorize(ctx.state.user, 'read', document);

  const revisions = await Revision.findAll({
    where: { documentId: id },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    revisions.map(revision => presentRevision(ctx, revision))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.search', auth(), pagination(), async ctx => {
  const { query } = ctx.body;
  const { offset, limit } = ctx.state.pagination;
  ctx.assertPresent(query, 'query is required');

  const user = ctx.state.user;
  const documents = await Document.searchForUser(user, query, {
    offset,
    limit,
  });

  const data = await Promise.all(
    documents.map(async document => await presentDocument(ctx, document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.pin', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = ctx.state.user;
  const document = await Document.findById(id);

  authorize(user, 'update', document);

  document.pinnedById = user.id;
  await document.save();

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.unpin', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = ctx.state.user;
  const document = await Document.findById(id);

  authorize(user, 'update', document);

  document.pinnedById = null;
  await document.save();

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.star', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = ctx.state.user;
  const document = await Document.findById(id);

  authorize(user, 'read', document);

  await Star.findOrCreate({
    where: { documentId: document.id, userId: user.id },
  });
});

router.post('documents.unstar', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = ctx.state.user;
  const document = await Document.findById(id);

  authorize(user, 'read', document);

  await Star.destroy({
    where: { documentId: document.id, userId: user.id },
  });
});

router.post('documents.create', auth(), async ctx => {
  const { title, text, publish, parentDocument, index } = ctx.body;
  const collectionId = ctx.body.collection;
  ctx.assertPresent(collectionId, 'collection is required');
  ctx.assertUuid(collectionId, 'collection must be an uuid');
  ctx.assertPresent(title, 'title is required');
  ctx.assertPresent(text, 'text is required');
  if (parentDocument)
    ctx.assertUuid(parentDocument, 'parentDocument must be an uuid');
  if (index) ctx.assertPositiveInteger(index, 'index must be an integer (>=0)');

  const user = ctx.state.user;
  authorize(user, 'create', Document);

  const collection = await Collection.findOne({
    where: {
      id: collectionId,
      teamId: user.teamId,
    },
  });
  authorize(user, 'publish', collection);

  let parentDocumentObj = {};
  if (parentDocument && collection.type === 'atlas') {
    parentDocumentObj = await Document.findOne({
      where: {
        id: parentDocument,
        atlasId: collection.id,
      },
    });
    authorize(user, 'read', parentDocumentObj);
  }

  let document = await Document.create({
    parentDocumentId: parentDocumentObj.id,
    atlasId: collection.id,
    teamId: user.teamId,
    userId: user.id,
    lastModifiedById: user.id,
    createdById: user.id,
    title,
    text,
  });

  if (publish) {
    await document.publish();
  }

  // reload to get all of the data needed to present (user, collection etc)
  // we need to specify publishedAt to bypass default scope that only returns
  // published documents
  document = await Document.find({
    where: { id: document.id, publishedAt: document.publishedAt },
  });

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.update', auth(), async ctx => {
  const { id, title, text, publish, autosave, done, lastRevision } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  ctx.assertPresent(title || text, 'title or text is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);

  authorize(ctx.state.user, 'update', document);

  if (lastRevision && lastRevision !== document.revisionCount) {
    throw new InvalidRequestError('Document has changed since last revision');
  }

  // Update document
  if (title) document.title = title;
  if (text) document.text = text;
  document.lastModifiedById = user.id;

  if (publish) {
    await document.publish();
  } else {
    await document.save({ autosave });

    if (document.publishedAt && done) {
      events.add({ name: 'documents.update', model: document });
    }
  }

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.move', auth(), async ctx => {
  const { id, parentDocument, index } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  if (parentDocument)
    ctx.assertUuid(parentDocument, 'parentDocument must be a uuid');
  if (index) ctx.assertPositiveInteger(index, 'index must be an integer (>=0)');

  const user = ctx.state.user;
  const document = await Document.findById(id);
  authorize(user, 'update', document);

  const collection = document.collection;
  if (collection.type !== 'atlas')
    throw new InvalidRequestError('This document can’t be moved');

  // Set parent document
  if (parentDocument) {
    const parent = await Document.findById(parentDocument);
    authorize(user, 'update', parent);
  }

  if (parentDocument === id)
    throw new InvalidRequestError('Infinite loop detected and prevented!');

  // If no parent document is provided, set it as null (move to root level)
  document.parentDocumentId = parentDocument;
  await document.save();

  await collection.moveDocument(document, index);
  // Update collection
  document.collection = collection;

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const document = await Document.findById(id);
  authorize(ctx.state.user, 'delete', document);

  const collection = document.collection;
  if (collection.type === 'atlas') {
    // Delete document and all of its children
    await collection.removeDocument(document);
  }

  await document.destroy();

  ctx.body = {
    success: true,
  };
});

export default router;
