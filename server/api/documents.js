// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';

import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentDocument, presentRevision } from '../presenters';
import { Document, Collection, Star, View, Revision } from '../models';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('documents.list', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction, collection } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  let where = { teamId: user.teamId };
  if (collection) where = { ...where, atlasId: collection };

  const userId = user.id;
  const starredScope = { method: ['withStarred', userId] };
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

router.post('documents.info', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const document = await Document.findById(id);

  authorize(ctx.state.user, 'read', document);

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

  const user = await ctx.state.user;

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

router.post('documents.star', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = await ctx.state.user;
  const document = await Document.findById(id);

  authorize(ctx.state.user, 'read', document);

  await Star.findOrCreate({
    where: { documentId: document.id, userId: user.id },
  });
});

router.post('documents.unstar', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = await ctx.state.user;
  const document = await Document.findById(id);

  authorize(ctx.state.user, 'read', document);

  await Star.destroy({
    where: { documentId: document.id, userId: user.id },
  });
});

router.post('documents.create', auth(), async ctx => {
  const { collection, title, text, parentDocument, index } = ctx.body;
  ctx.assertPresent(collection, 'collection is required');
  ctx.assertUuid(collection, 'collection must be an uuid');
  ctx.assertPresent(title, 'title is required');
  ctx.assertPresent(text, 'text is required');
  if (parentDocument)
    ctx.assertUuid(parentDocument, 'parentDocument must be an uuid');
  if (index) ctx.assertPositiveInteger(index, 'index must be an integer (>=0)');

  const user = ctx.state.user;
  authorize(user, 'create', Document);

  const ownerCollection = await Collection.findOne({
    where: {
      id: collection,
      teamId: user.teamId,
    },
  });
  authorize(user, 'publish', ownerCollection);

  if (!ownerCollection) throw httpErrors.BadRequest();

  let parentDocumentObj = {};
  if (parentDocument && ownerCollection.type === 'atlas') {
    parentDocumentObj = await Document.findOne({
      where: {
        id: parentDocument,
        atlasId: ownerCollection.id,
      },
    });
    if (!parentDocumentObj)
      throw httpErrors.BadRequest('Invalid parentDocument');
  }

  const newDocument = await Document.create({
    parentDocumentId: parentDocumentObj.id,
    atlasId: ownerCollection.id,
    teamId: user.teamId,
    userId: user.id,
    lastModifiedById: user.id,
    createdById: user.id,
    title,
    text,
  });

  // reload to get all of the data needed to present (user, collection etc)
  const document = await Document.findById(newDocument.id);

  if (ownerCollection.type === 'atlas') {
    await ownerCollection.addDocumentToStructure(document, index);
  }

  document.collection = ownerCollection;

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.update', auth(), async ctx => {
  const { id, title, text, lastRevision } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  ctx.assertPresent(title || text, 'title or text is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);

  authorize(ctx.state.user, 'update', document);

  if (lastRevision && lastRevision !== document.revisionCount) {
    throw httpErrors.BadRequest('Document has changed since last revision');
  }

  // Update document
  if (title) document.title = title;
  if (text) document.text = text;
  document.lastModifiedById = user.id;

  await document.save();
  const collection = document.collection;
  if (collection.type === 'atlas') {
    await collection.updateDocument(document);
  }

  document.collection = collection;

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.move', auth(), async ctx => {
  const { id, parentDocument, index } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  if (parentDocument)
    ctx.assertUuid(parentDocument, 'parentDocument must be an uuid');
  if (index) ctx.assertPositiveInteger(index, 'index must be an integer (>=0)');

  const document = await Document.findById(id);
  authorize(ctx.state.user, 'update', document);

  const collection = document.collection;
  if (collection.type !== 'atlas')
    throw httpErrors.BadRequest("This document can't be moved");

  // Set parent document
  if (parentDocument) {
    const parent = await Document.findById(parentDocument);
    if (!parent || parent.atlasId !== document.atlasId)
      throw httpErrors.BadRequest(
        'Invalid parentDocument (must be same collection)'
      );
  }

  if (parentDocument === id)
    throw httpErrors.BadRequest('Infinite loop detected and prevented!');

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
    // Don't allow deletion of root docs
    if (collection.documentStructure.length === 1) {
      throw httpErrors.BadRequest(
        "Unable to delete collection's only document"
      );
    }

    // Delete document and all of its children
    try {
      await collection.removeDocument(document);
    } catch (e) {
      throw httpErrors.BadRequest('Error while deleting');
    }
  }

  // Delete the actual document
  try {
    await document.destroy();
  } catch (e) {
    throw httpErrors.BadRequest('Error while deleting document');
  }

  ctx.body = {
    success: true,
  };
});

export default router;
