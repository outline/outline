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
import {
  Document,
  Collection,
  Share,
  Star,
  View,
  Revision,
  Backlink,
  User,
} from '../models';
import { InvalidRequestError } from '../errors';
import events from '../events';
import policy from '../policies';
import { sequelize } from '../sequelize';

const Op = Sequelize.Op;
const { authorize, cannot } = policy;
const router = new Router();

router.post('documents.list', auth(), pagination(), async ctx => {
  const { sort = 'updatedAt' } = ctx.body;
  const collectionId = ctx.body.collection;
  const createdById = ctx.body.user;
  const backlinkDocumentId = ctx.body.backlinkDocumentId;
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
    const collection = await Collection.findByPk(collectionId);
    authorize(user, 'read', collection);

    // otherwise, filter by all collections the user has access to
  } else {
    const collectionIds = await user.collectionIds();
    where = { ...where, collectionId: collectionIds };
  }

  if (backlinkDocumentId) {
    const backlinks = await Backlink.findAll({
      attributes: ['reverseDocumentId'],
      where: {
        documentId: backlinkDocumentId,
      },
    });

    where = {
      ...where,
      id: backlinks.map(backlink => backlink.reverseDocumentId),
    };
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
  const collection = await Collection.findByPk(collectionId);
  authorize(user, 'read', collection);

  const starredScope = { method: ['withStarred', user.id] };
  const documents = await Document.scope('defaultScope', starredScope).findAll({
    where: {
      teamId: user.teamId,
      collectionId,
      pinnedById: {
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
    const share = await Share.findOne({
      where: {
        revokedAt: { [Op.eq]: null },
        id: shareId,
      },
      include: [
        {
          // unscoping here allows us to return unpublished documents
          model: Document.unscoped(),
          include: [
            { model: User, as: 'createdBy', paranoid: false },
            { model: User, as: 'updatedBy', paranoid: false },
          ],
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
    document = await Document.findByPk(id);
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

  const document = await Document.findByPk(id);
  authorize(ctx.state.user, 'read', document);

  const revision = await Revision.findOne({
    where: {
      id: revisionId,
      documentId: document.id,
    },
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: presentRevision(revision),
  };
});

router.post('documents.revisions', auth(), pagination(), async ctx => {
  let { id, sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';
  ctx.assertPresent(id, 'id is required');
  const document = await Document.findByPk(id);

  authorize(ctx.state.user, 'read', document);

  const revisions = await Revision.findAll({
    where: { documentId: id },
    order: [[sort, direction]],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: revisions.map(presentRevision),
  };
});

router.post('documents.restore', auth(), async ctx => {
  const { id, revisionId } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findByPk(id);

  if (document.archivedAt) {
    authorize(user, 'unarchive', document);

    // restore a previously archived document
    await document.unarchive(user.id);

    events.add({
      name: 'documents.unarchive',
      modelId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
    });
  } else if (revisionId) {
    // restore a document to a specific revision
    authorize(user, 'update', document);

    const revision = await Revision.findByPk(revisionId);
    authorize(document, 'restore', revision);

    document.text = revision.text;
    document.title = revision.title;
    await document.save();

    events.add({
      name: 'documents.restore',
      modelId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
    });
  } else {
    ctx.assertPresent(revisionId, 'revisionId is required');
  }

  ctx.body = {
    data: await presentDocument(document),
  };
});

router.post('documents.search', auth(), pagination(), async ctx => {
  const { query, includeArchived, collectionId, userId, dateFilter } = ctx.body;
  const { offset, limit } = ctx.state.pagination;
  const user = ctx.state.user;
  ctx.assertPresent(query, 'query is required');

  if (collectionId) {
    ctx.assertUuid(collectionId, 'collectionId must be a UUID');

    const collection = await Collection.findByPk(collectionId);
    authorize(user, 'read', collection);
  }

  let collaboratorIds = undefined;
  if (userId) {
    ctx.assertUuid(userId, 'userId must be a UUID');
    collaboratorIds = [userId];
  }

  if (dateFilter) {
    ctx.assertIn(
      dateFilter,
      ['day', 'week', 'month', 'year'],
      'dateFilter must be one of day,week,month,year'
    );
  }

  const results = await Document.searchForUser(user, query, {
    includeArchived: includeArchived === 'true',
    collaboratorIds,
    collectionId,
    dateFilter,
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
  const document = await Document.findByPk(id);

  authorize(user, 'update', document);

  document.pinnedById = user.id;
  await document.save();

  events.add({
    name: 'documents.pin',
    modelId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
  });

  ctx.body = {
    data: await presentDocument(document),
  };
});

router.post('documents.unpin', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = ctx.state.user;
  const document = await Document.findByPk(id);

  authorize(user, 'update', document);

  document.pinnedById = null;
  await document.save();

  events.add({
    name: 'documents.unpin',
    modelId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
  });

  ctx.body = {
    data: await presentDocument(document),
  };
});

router.post('documents.star', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = ctx.state.user;
  const document = await Document.findByPk(id);

  authorize(user, 'read', document);

  await Star.findOrCreate({
    where: { documentId: document.id, userId: user.id },
  });

  events.add({
    name: 'documents.star',
    modelId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
  });
});

router.post('documents.unstar', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  const user = ctx.state.user;
  const document = await Document.findByPk(id);

  authorize(user, 'read', document);

  await Star.destroy({
    where: { documentId: document.id, userId: user.id },
  });

  events.add({
    name: 'documents.unstar',
    modelId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
  });
});

router.post('documents.create', auth(), async ctx => {
  const {
    title,
    text,
    publish,
    collectionId,
    parentDocumentId,
    index,
  } = ctx.body;
  ctx.assertUuid(collectionId, 'collectionId must be an uuid');
  ctx.assertPresent(text, 'text is required');
  if (parentDocumentId) {
    ctx.assertUuid(parentDocumentId, 'parentDocumentId must be an uuid');
  }

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

  let parentDocument;
  if (parentDocumentId && collection.type === 'atlas') {
    parentDocument = await Document.findOne({
      where: {
        id: parentDocumentId,
        collectionId: collection.id,
      },
    });
    authorize(user, 'read', parentDocument);
  }

  let document = await Document.create({
    parentDocumentId,
    collectionId: collection.id,
    teamId: user.teamId,
    userId: user.id,
    lastModifiedById: user.id,
    createdById: user.id,
    title,
    text,
  });

  events.add({
    name: 'documents.create',
    modelId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
  });

  if (publish) {
    await document.publish();

    events.add({
      name: 'documents.publish',
      modelId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: user.id,
    });
  }

  // reload to get all of the data needed to present (user, collection etc)
  // we need to specify publishedAt to bypass default scope that only returns
  // published documents
  document = await Document.findOne({
    where: { id: document.id, publishedAt: document.publishedAt },
  });

  ctx.body = {
    data: await presentDocument(document),
  };
});

router.post('documents.update', auth(), async ctx => {
  const {
    id,
    title,
    text,
    publish,
    autosave,
    done,
    lastRevision,
    append,
  } = ctx.body;
  ctx.assertPresent(id, 'id is required');
  ctx.assertPresent(title || text, 'title or text is required');
  if (append) ctx.assertPresent(text, 'Text is required while appending');

  const user = ctx.state.user;
  const document = await Document.findByPk(id);

  authorize(ctx.state.user, 'update', document);

  if (lastRevision && lastRevision !== document.revisionCount) {
    throw new InvalidRequestError('Document has changed since last revision');
  }

  // Update document
  if (title) document.title = title;

  if (append) {
    document.text += text;
  } else if (text) {
    document.text = text;
  }
  document.lastModifiedById = user.id;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    if (publish) {
      await document.publish({ transaction });
      await transaction.commit();

      events.add({
        name: 'documents.publish',
        modelId: document.id,
        collectionId: document.collectionId,
        teamId: document.teamId,
        actorId: user.id,
      });
    } else {
      await document.save({ autosave, transaction });
      await transaction.commit();

      events.add({
        name: 'documents.update',
        modelId: document.id,
        collectionId: document.collectionId,
        teamId: document.teamId,
        actorId: user.id,
        autosave,
        done,
      });
    }
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    throw err;
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
  const document = await Document.findByPk(id);
  authorize(user, 'move', document);

  const collection = await Collection.findByPk(collectionId);
  authorize(user, 'update', collection);

  if (collection.type !== 'atlas' && parentDocumentId) {
    throw new InvalidRequestError(
      'Document cannot be nested in this collection type'
    );
  }

  if (parentDocumentId) {
    const parent = await Document.findByPk(parentDocumentId);
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
  const document = await Document.findByPk(id);
  authorize(user, 'archive', document);

  await document.archive(user.id);

  events.add({
    name: 'documents.archive',
    modelId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
  });

  ctx.body = {
    data: await presentDocument(document),
  };
});

router.post('documents.delete', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertPresent(id, 'id is required');

  const user = ctx.state.user;
  const document = await Document.findByPk(id);
  authorize(user, 'delete', document);

  await document.delete();

  events.add({
    name: 'documents.delete',
    modelId: document.id,
    collectionId: document.collectionId,
    teamId: document.teamId,
    actorId: user.id,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
