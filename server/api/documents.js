// @flow
import Router from 'koa-router';
import Sequelize from 'sequelize';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import documentMover from '../commands/documentMover';
import {
  presentDocument,
  presentCollection,
  presentRevision,
} from '../presenters';
import { Document, Collection, Share, Star, View, Revision } from '../models';
import { InvalidRequestError } from '../errors';
import events from '../events';
import policy from '../policies';

const Op = Sequelize.Op;
const { authorize, cannot } = policy;
const router = new Router();

router.post('documents.list', auth(), pagination(), async ctx => {
  const { sort = 'updatedAt' } = ctx.body;
  const collectionId = ctx.body.collection;
  const createdById = ctx.body.user;
  let direction = ctx.body.direction;
  if (direction !== 'ASC') direction = 'DESC';

  // always filter by the current team
  const user = ctx.state.user;
  let where = { teamId: user.teamId };

  // if a specific user is passed then add to filters. If the user doesn't
  // exist in the team then nothing will be returned, so no need to check auth
  if (createdById) {
    ctx.assertUuid(createdById, 'user must be a UUID');
    where = { ...where, createdById };
  }

  // if a specific collection is passed then we need to check auth to view it
  if (collectionId) {
    ctx.assertUuid(collectionId, 'collection must be a UUID');

    where = { ...where, collectionId };
    const collection = await Collection.findById(collectionId);
    authorize(user, 'read', collection);

    // otherwise, filter by all collections the user has access to
  } else {
    const collectionIds = await user.collectionIds();
    where = { ...where, collectionId: collectionIds };
  }

  // add the users starred state to the response by default
  const starredScope = { method: ['withStarred', user.id] };
  const documents = await Document.scope('defaultScope', starredScope).findAll({
    where,
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    documents.map(document => presentDocument(document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.pinned', auth(), pagination(), async ctx => {
  const { sort = 'updatedAt' } = ctx.body;
  const collectionId = ctx.body.collection;
  let direction = ctx.body.direction;
  if (direction !== 'ASC') direction = 'DESC';
  ctx.assertUuid(collectionId, 'collection is required');

  const user = ctx.state.user;
  const collection = await Collection.findById(collectionId);
  authorize(user, 'read', collection);

  const starredScope = { method: ['withStarred', user.id] };
  const documents = await Document.scope('defaultScope', starredScope).findAll({
    where: {
      teamId: user.teamId,
      collectionId,
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
    documents.map(document => presentDocument(document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.archived', auth(), pagination(), async ctx => {
  const { sort = 'updatedAt' } = ctx.body;
  let direction = ctx.body.direction;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const collectionIds = await user.collectionIds();

  const documents = await Document.findAll({
    where: {
      teamId: user.teamId,
      collectionId: collectionIds,
      archivedAt: {
        // $FlowFixMe
        [Op.ne]: null,
      },
    },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    documents.map(document => presentDocument(document))
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
  const collectionIds = await user.collectionIds();

  const views = await View.findAll({
    where: { userId: user.id },
    order: [[sort, direction]],
    include: [
      {
        model: Document,
        required: true,
        where: {
          collectionId: collectionIds,
        },
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
    views.map(view => presentDocument(view.document))
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
  const collectionIds = await user.collectionIds();

  const stars = await Star.findAll({
    where: {
      userId: user.id,
    },
    order: [[sort, direction]],
    include: [
      {
        model: Document,
        where: {
          collectionId: collectionIds,
        },
        include: [
          {
            model: Star,
            as: 'starred',
            where: {
              userId: user.id,
            },
          },
        ],
      },
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    stars.map(star => presentDocument(star.document))
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
  const collectionIds = await user.collectionIds();

  const documents = await Document.findAll({
    where: {
      userId: user.id,
      collectionId: collectionIds,
      // $FlowFixMe
      publishedAt: { [Op.eq]: null },
    },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    documents.map(document => presentDocument(document))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.info', auth({ required: false }), async ctx => {
  const { id, shareId } = ctx.body;
  ctx.assertPresent(id || shareId, 'id or shareId is required');

  const user = ctx.state.user;
  let document;

  if (shareId) {
    const share = await Share.find({
      where: {
        // $FlowFixMe
        revokedAt: { [Op.eq]: null },
        id: shareId,
      },
      include: [
        {
          model: Document,
          required: true,
          as: 'document',
        },
      ],
    });
    if (!share || share.document.archivedAt) {
      throw new InvalidRequestError('Document could not be found for shareId');
    }
    document = share.document;
  } else {
    document = await Document.findById(id);
    authorize(user, 'read', document);
  }

  const isPublic = cannot(user, 'read', document);

  ctx.body = {
    data: await presentDocument(document, { isPublic }),
  };
});

router.post('documents.revision', auth(), async ctx => {
  let { id, revisionId } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  ctx.assertPresent(revisionId, 'revisionId is required');

  const document = await Document.findById(id);
  authorize(ctx.state.user, 'read', document);

  const revision = await Revision.findOne({
    where: {
      id: revisionId,
      documentId: document.id,
    },
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: presentRevision(ctx, revision),
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
    revisions.map((revision, index) => presentRevision(ctx, revision))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('documents.restore', auth(), async ctx => {
  const { id, revisionId } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);

  if (document.archivedAt) {
    authorize(user, 'unarchive', document);

    // restore a previously archived document
    await document.unarchive(user.id);

    // restore a document to a specific revision
  } else if (revisionId) {
    authorize(user, 'update', document);

    const revision = await Revision.findById(revisionId);
    authorize(document, 'restore', revision);

    document.text = revision.text;
    document.title = revision.title;
    await document.save();
  } else {
    ctx.assertPresent(revisionId, 'revisionId is required');
  }

  ctx.body = {
    data: await presentDocument(document),
  };
});

router.post('documents.search', auth(), pagination(), async ctx => {
  const { query, includeArchived } = ctx.body;
  const { offset, limit } = ctx.state.pagination;
  ctx.assertPresent(query, 'query is required');

  const user = ctx.state.user;
  const results = await Document.searchForUser(user, query, {
    includeArchived: includeArchived === 'true',
    offset,
    limit,
  });

  const data = await Promise.all(
    results.map(async result => {
      const document = await presentDocument(result.document);
      return { ...result, document };
    })
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
    data: await presentDocument(document),
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
    data: await presentDocument(document),
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
        collectionId: collection.id,
      },
    });
    authorize(user, 'read', parentDocumentObj);
  }

  let document = await Document.create({
    parentDocumentId: parentDocumentObj.id,
    collectionId: collection.id,
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
    data: await presentDocument(document),
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
    data: await presentDocument(document),
  };
});

router.post('documents.move', auth(), async ctx => {
  const { id, collectionId, parentDocumentId, index } = ctx.body;
  ctx.assertUuid(id, 'id must be a uuid');
  ctx.assertUuid(collectionId, 'collectionId must be a uuid');

  if (parentDocumentId) {
    ctx.assertUuid(parentDocumentId, 'parentDocumentId must be a uuid');
  }
  if (index) {
    ctx.assertPositiveInteger(index, 'index must be a positive integer');
  }
  if (parentDocumentId === id) {
    throw new InvalidRequestError(
      'Infinite loop detected, cannot nest a document inside itself'
    );
  }

  const user = ctx.state.user;
  const document = await Document.findById(id);
  authorize(user, 'move', document);

  const collection = await Collection.findById(collectionId);
  authorize(user, 'update', collection);

  if (collection.type !== 'atlas' && parentDocumentId) {
    throw new InvalidRequestError(
      'Document cannot be nested in this collection type'
    );
  }

  if (parentDocumentId) {
    const parent = await Document.findById(parentDocumentId);
    authorize(user, 'update', parent);
  }

  const { documents, collections } = await documentMover({
    document,
    collectionId,
    parentDocumentId,
    index,
  });

  ctx.body = {
    data: {
      documents: await Promise.all(
        documents.map(document => presentDocument(document))
      ),
      collections: await Promise.all(
        collections.map(collection => presentCollection(collection))
      ),
    },
  };
});

router.post('documents.archive', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);
  authorize(user, 'archive', document);

  await document.archive(user.id);

  ctx.body = {
    data: await presentDocument(document),
  };
});

router.post('documents.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findById(id);
  authorize(user, 'delete', document);

  await document.delete();

  ctx.body = {
    success: true,
  };
});

export default router;
