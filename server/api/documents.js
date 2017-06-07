// @flow
import Router from 'koa-router';
import httpErrors from 'http-errors';
import isUUID from 'validator/lib/isUUID';

const URL_REGEX = /^[a-zA-Z0-9-]*-([a-zA-Z0-9]{10,15})$/;

import auth from './middlewares/authentication';
import { presentDocument } from '../presenters';
import { Document, Collection } from '../models';

const router = new Router();

const getDocumentForId = async id => {
  try {
    let document;
    if (isUUID(id)) {
      document = await Document.findOne({
        where: {
          id,
        },
      });
    } else if (id.match(URL_REGEX)) {
      document = await Document.findOne({
        where: {
          urlId: id.match(URL_REGEX)[1],
        },
      });
    } else {
      throw httpErrors.NotFound();
    }
    return document;
  } catch (e) {
    // Invalid UUID
    throw httpErrors.NotFound();
  }
};

// FIXME: This really needs specs :/
router.post('documents.info', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const document = await getDocumentForId(id);

  if (!document) throw httpErrors.NotFound();

  // Don't expose private documents outside the team
  if (document.private) {
    if (!ctx.state.user) throw httpErrors.NotFound();

    const user = await ctx.state.user;
    if (document.teamId !== user.teamId) {
      throw httpErrors.NotFound();
    }

    ctx.body = {
      data: await presentDocument(ctx, document, {
        includeCollection: true,
        includeCollaborators: true,
      }),
    };
  } else {
    ctx.body = {
      data: await presentDocument(ctx, document, {
        includeCollaborators: true,
      }),
    };
  }
});

router.post('documents.search', auth(), async ctx => {
  const { query } = ctx.body;
  ctx.assertPresent(query, 'query is required');

  const user = await ctx.state.user;

  const documents = await Document.searchForUser(user, query);

  const data = [];
  await Promise.all(
    documents.map(async document => {
      data.push(
        await presentDocument(ctx, document, {
          includeCollection: true,
          includeCollaborators: true,
        })
      );
    })
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
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

  if (ownerCollection.type === 'atlas') {
    await ownerCollection.addDocumentToStructure(newDocument, index);
  }

  ctx.body = {
    data: await presentDocument(ctx, newDocument, {
      includeCollection: true,
      includeCollaborators: true,
      collection: ownerCollection,
    }),
  };
});

router.post('documents.update', auth(), async ctx => {
  const { id, title, text } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  ctx.assertPresent(title || text, 'title or text is required');

  const user = ctx.state.user;
  const document = await getDocumentForId(id);

  if (!document || document.teamId !== user.teamId) throw httpErrors.NotFound();

  // Update document
  if (title) document.title = title;
  if (text) document.text = text;
  document.lastModifiedById = user.id;
  await document.save();

  const collection = await Collection.findById(document.atlasId);
  if (collection.type === 'atlas') {
    await collection.updateDocument(document);
  }

  ctx.body = {
    data: await presentDocument(ctx, document, {
      includeCollection: true,
      includeCollaborators: true,
      collection: collection,
    }),
  };
});

router.post('documents.move', auth(), async ctx => {
  const { id, parentDocument, index } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  if (parentDocument)
    ctx.assertUuid(parentDocument, 'parentDocument must be an uuid');
  if (index) ctx.assertPositiveInteger(index, 'index must be an integer (>=0)');

  const user = ctx.state.user;
  const document = await getDocumentForId(id);

  if (!document || document.teamId !== user.teamId) throw httpErrors.NotFound();

  // Set parent document
  if (parentDocument) {
    const parent = await getDocumentForId(parentDocument);
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

  ctx.body = {
    data: await presentDocument(ctx, document, {
      includeCollection: true,
      includeCollaborators: true,
      collection: collection,
    }),
  };
});

router.post('documents.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await getDocumentForId(id);
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

    // Delete all chilren
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
