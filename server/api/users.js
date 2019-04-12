// @flow
import uuid from 'uuid';
import Router from 'koa-router';
import { makePolicy, signPolicy, publicS3Endpoint } from '../utils/s3';
import { ValidationError } from '../errors';
import { Event, User, Team } from '../models';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentUser } from '../presenters';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('users.list', auth(), pagination(), async ctx => {
  const user = ctx.state.user;

  const users = await User.findAll({
    where: {
      teamId: user.teamId,
    },
    order: [['createdAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: users.map(listUser =>
      presentUser(listUser, { includeDetails: user.isAdmin })
    ),
  };
});

router.post('users.info', auth(), async ctx => {
  ctx.body = { data: await presentUser(ctx.state.user) };
});

router.post('users.update', auth(), async ctx => {
  const { user } = ctx.state;
  const { name, avatarUrl } = ctx.body;
  const endpoint = publicS3Endpoint();

  if (name) user.name = name;
  if (avatarUrl && avatarUrl.startsWith(`${endpoint}/uploads/${user.id}`)) {
    user.avatarUrl = avatarUrl;
  }

  await user.save();

  ctx.body = { data: await presentUser(user, { includeDetails: true }) };
});

router.post('users.s3Upload', auth(), async ctx => {
  const { filename, kind, size } = ctx.body;
  ctx.assertPresent(filename, 'filename is required');
  ctx.assertPresent(kind, 'kind is required');
  ctx.assertPresent(size, 'size is required');

  const s3Key = uuid.v4();
  const key = `uploads/${ctx.state.user.id}/${s3Key}/${filename}`;
  const policy = makePolicy();
  const endpoint = publicS3Endpoint();
  const url = `${endpoint}/${key}`;

  await Event.create({
    name: 'user.s3Upload',
    data: {
      filename,
      kind,
      size,
      url,
    },
    teamId: ctx.state.user.teamId,
    userId: ctx.state.user.id,
  });

  ctx.body = {
    data: {
      maxUploadSize: process.env.AWS_S3_UPLOAD_MAX_SIZE,
      uploadUrl: endpoint,
      form: {
        AWSAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        'Cache-Control': 'max-age=31557600',
        'Content-Type': kind,
        key,
        acl: 'public-read',
        signature: signPolicy(policy),
        policy,
      },
      asset: {
        contentType: kind,
        name: filename,
        url,
        size,
      },
    },
  };
});

// Admin specific

router.post('users.promote', auth(), async ctx => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findById(userId);
  authorize(ctx.state.user, 'promote', user);

  const team = await Team.findById(teamId);
  await team.addAdmin(user);

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

router.post('users.demote', auth(), async ctx => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findById(userId);
  authorize(ctx.state.user, 'demote', user);

  const team = await Team.findById(teamId);
  try {
    await team.removeAdmin(user);
  } catch (err) {
    throw new ValidationError(err.message);
  }

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

/**
 * Suspend user
 *
 * Admin can suspend users to reduce the number of accounts on their billing plan
 */
router.post('users.suspend', auth(), async ctx => {
  const admin = ctx.state.user;
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findById(userId);
  authorize(ctx.state.user, 'suspend', user);

  const team = await Team.findById(teamId);
  try {
    await team.suspendUser(user, admin);
  } catch (err) {
    throw new ValidationError(err.message);
  }

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

/**
 * Activate user
 *
 * Admin can activate users to let them access resources. These users will also
 * account towards the billing plan limits.
 */
router.post('users.activate', auth(), async ctx => {
  const admin = ctx.state.user;
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findById(userId);
  authorize(ctx.state.user, 'activate', user);

  const team = await Team.findById(teamId);
  await team.activateUser(user, admin);

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

router.post('users.delete', auth(), async ctx => {
  const { confirmation } = ctx.body;
  ctx.assertPresent(confirmation, 'confirmation is required');

  const user = ctx.state.user;
  authorize(user, 'delete', user);

  try {
    await user.destroy();
  } catch (err) {
    throw new ValidationError(err.message);
  }

  ctx.body = {
    success: true,
  };
});

export default router;
