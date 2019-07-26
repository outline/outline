// @flow
import fs from 'fs';
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentCollection, presentUser } from '../presenters';
import { Collection, CollectionUser, Team, User } from '../models';
import { ValidationError, InvalidRequestError } from '../errors';
import { exportCollections } from '../logistics';
import { archiveCollection } from '../utils/zip';
import policy from '../policies';
import events from '../events';

const { authorize } = policy;
const router = new Router();

router.post('collections.create', auth(), async ctx => {
  const { name, color, description, type } = ctx.body;
  const isPrivate = ctx.body.private;

  ctx.assertPresent(name, 'name is required');
  if (color)
    ctx.assertHexColor(color, 'Invalid hex value (please use format #FFFFFF)');

  const user = ctx.state.user;
  authorize(user, 'create', Collection);

  const collection = await Collection.create({
    name,
    description,
    color,
    type: type || 'atlas',
    teamId: user.teamId,
    creatorId: user.id,
    private: isPrivate,
  });

  events.add({
    name: 'collections.create',
    modelId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
  });

  ctx.body = {
    data: await presentCollection(collection),
  };
});

router.post('collections.info', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const collection = await Collection.findByPk(id);
  authorize(ctx.state.user, 'read', collection);

  ctx.body = {
    data: await presentCollection(collection),
  };
});

router.post('collections.add_user', auth(), async ctx => {
  const { id, userId, permission = 'read_write' } = ctx.body;
  ctx.assertUuid(id, 'id is required');
  ctx.assertUuid(userId, 'userId is required');

  const collection = await Collection.findByPk(id);
  authorize(ctx.state.user, 'update', collection);

  if (!collection.private) {
    throw new InvalidRequestError('Collection must be private to add users');
  }

  const user = await User.findByPk(userId);
  authorize(ctx.state.user, 'read', user);

  await CollectionUser.create({
    collectionId: id,
    userId,
    permission,
    createdById: ctx.state.user.id,
  });

  events.add({
    name: 'collections.add_user',
    modelId: userId,
    collectionId: collection.id,
    teamId: collection.teamId,
    actorId: ctx.state.user.id,
  });

  ctx.body = {
    success: true,
  };
});

router.post('collections.remove_user', auth(), async ctx => {
  const { id, userId } = ctx.body;
  ctx.assertUuid(id, 'id is required');
  ctx.assertUuid(userId, 'userId is required');

  const collection = await Collection.findByPk(id);
  authorize(ctx.state.user, 'update', collection);

  if (!collection.private) {
    throw new InvalidRequestError('Collection must be private to remove users');
  }

  const user = await User.findByPk(userId);
  authorize(ctx.state.user, 'read', user);

  await collection.removeUser(user);

  events.add({
    name: 'collections.remove_user',
    modelId: userId,
    collectionId: collection.id,
    teamId: collection.teamId,
    actorId: ctx.state.user.id,
  });

  ctx.body = {
    success: true,
  };
});

router.post('collections.users', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const collection = await Collection.findByPk(id);
  authorize(ctx.state.user, 'read', collection);

  const users = await collection.getUsers();

  ctx.body = {
    data: users.map(presentUser),
  };
});

router.post('collections.export', auth(), async ctx => {
  const { id } = ctx.body;
  ctx.assertUuid(id, 'id is required');

  const user = ctx.state.user;
  const collection = await Collection.findByPk(id);
  authorize(user, 'export', collection);

  const filePath = await archiveCollection(collection);

  ctx.attachment(`${collection.name}.zip`);
  ctx.set('Content-Type', 'application/force-download');
  ctx.body = fs.createReadStream(filePath);
});

router.post('collections.exportAll', auth(), async ctx => {
  const user = ctx.state.user;
  const team = await Team.findByPk(user.teamId);
  authorize(user, 'export', team);

  // async operation to create zip archive and email user
  exportCollections(user.teamId, user.email);

  ctx.body = {
    success: true,
  };
});

router.post('collections.update', auth(), async ctx => {
  const { id, name, description, color } = ctx.body;
  const isPrivate = ctx.body.private;

  ctx.assertPresent(name, 'name is required');
  if (color)
    ctx.assertHexColor(color, 'Invalid hex value (please use format #FFFFFF)');

  const user = ctx.state.user;
  const collection = await Collection.findByPk(id);
  authorize(user, 'update', collection);

  if (isPrivate && !collection.private) {
    await CollectionUser.findOrCreate({
      where: {
        collectionId: collection.id,
        userId: user.id,
      },
      defaults: {
        permission: 'read_write',
        createdById: user.id,
      },
    });
  }

  collection.name = name;
  collection.description = description;
  collection.color = color;
  collection.private = isPrivate;
  await collection.save();

  events.add({
    name: 'collections.update',
    modelId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
  });

  ctx.body = {
    data: presentCollection(collection),
  };
});

router.post('collections.list', auth(), pagination(), async ctx => {
  const user = ctx.state.user;

  const collectionIds = await user.collectionIds();
  let collections = await Collection.findAll({
    where: {
      teamId: user.teamId,
      id: collectionIds,
    },
    order: [['updatedAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  const data = await Promise.all(
    collections.map(async collection => await presentCollection(collection))
  );

  ctx.body = {
    pagination: ctx.state.pagination,
    data,
  };
});

router.post('collections.delete', auth(), async ctx => {
  const { id } = ctx.body;
  const user = ctx.state.user;
  ctx.assertUuid(id, 'id is required');

  const collection = await Collection.findByPk(id);
  authorize(user, 'delete', collection);

  const total = await Collection.count();
  if (total === 1) throw new ValidationError('Cannot delete last collection');

  await collection.destroy();

  events.add({
    name: 'collections.delete',
    modelId: collection.id,
    teamId: collection.teamId,
    actorId: user.id,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
