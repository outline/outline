// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';

import auth from './middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentDocument } from '../presenters';
import { Document, Collection, Star, View } from '../models';

const router = new Router();
router.post('documents.list', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const userId = user.id;
  const starredScope = { method: ['withStarred', userId] };
  const documents = await Document.scope('defaultScope', starredScope).findAll({
    where: { teamId: user.teamId },
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

  if (!document) throw httpErrors.NotFound();

  // Don't expose private documents outside the team
  if (document.private) {
    if (!ctx.state.user) throw httpErrors.NotFound();

    const user = await ctx.state.user;
    if (document.teamId !== user.teamId) {
      throw httpErrors.NotFound();
    }
  }

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.search', auth(), async ctx => {
  const { query } = ctx.body;
  ctx.assertPresent(query, 'query is required');

  const user = await ctx.state.user;

  const documents = await Document.searchForUser(user, query);

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

  if (!document || document.teamId !== user.teamId)
    throw httpErrors.BadRequest();

  await Star.findOrCreate({
    where: { documentId: document.id, userId: user.id },
  });
});

router.post('documents.unstar', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = await ctx.state.user;
  const document = await Document.findById(id);

  if (!document || document.teamId !== user.teamId)
    throw httpErrors.BadRequest();

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
  const ownerCollection = await Collection.findOne({
    where: {
      id: collection,
      teamId: user.teamId,
    },
  });

  if (!ownerCollection) throw httpErrors.BadRequest();

  let parentDocumentObj = {};
  if (parentDocument && ownerCollection.type === 'atlas') {
    parentDocumentObj = await Document.findOne({
      where: {
        id: parentDocument,
        atlasId: ownerCollection.id,
      },
    });
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
  const { id, title, text } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  ctx.assertPresent(title || text, 'title or text is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);
  const collection = document.collection;

  if (!document || document.teamId !== user.teamId) throw httpErrors.NotFound();

  // Update document
  if (title) document.title = title;
  if (text) document.text = text;
  document.lastModifiedById = user.id;

  const [updatedDocument, updatedCollection] = await Promise.all([
    document.save(),
    collection.type === 'atlas'
      ? await collection.updateDocument(document)
      : Promise.resolve(),
  ]);

  updatedDocument.collection = updatedCollection;

  ctx.body = {
    data: await presentDocument(ctx, updatedDocument),
  };
});

router.post('documents.move', auth(), async ctx => {
  const { id, parentDocument, index } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  if (parentDocument)
    ctx.assertUuid(parentDocument, 'parentDocument must be an uuid');
  if (index) ctx.assertPositiveInteger(index, 'index must be an integer (>=0)');

  const user = ctx.state.user;
  const document = await Document.findById(id);

  if (!document || document.teamId !== user.teamId) throw httpErrors.NotFound();

  // Set parent document
  if (parentDocument) {
    const parent = await Document.findById(parentDocument);
    if (parent.atlasId !== document.atlasId)
      throw httpErrors.BadRequest(
        'Invalid parentDocument (must be same collection)'
      );
  }

  if (parentDocument === id)
    throw httpErrors.BadRequest('Infinite loop detected and prevented!');

  // If no parent document is provided, set it as null (move to root level)
  document.parentDocumentId = parentDocument;
  await document.save();

  const collection = await Collection.findById(document.atlasId);
  if (collection.type === 'atlas') {
    await collection.deleteDocument(document);
    await collection.addDocumentToStructure(document, index);
  }
  // Update collection
  document.collection = collection;

  document.collection = collection;

  ctx.body = {
    data: await presentDocument(ctx, document),
  };
});

router.post('documents.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);
  const collection = await Collection.findById(document.atlasId);

  if (!document || document.teamId !== user.teamId)
    throw httpErrors.BadRequest();

  if (collection.type === 'atlas') {
    // Don't allow deletion of root docs
    if (collection.documentStructure.length === 1) {
      throw httpErrors.BadRequest(
        "Unable to delete collection's only document"
      );
    }

    // Delete all children
    try {
      await collection.deleteDocument(document);
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
