// @flow
import uuid from 'uuid';
import Router from 'koa-router';
import { makePolicy, signPolicy, publicS3Endpoint } from '../utils/s3';
import auth from './middlewares/authentication';
import { presentUser } from '../presenters';

const router = new Router();

router.post('user.info', auth(), async ctx => {
  ctx.body = { data: await presentUser(ctx, ctx.state.user) };
});

router.post('user.update', auth(), async ctx => {
  const { user } = ctx.state;
  const { name } = ctx.body;
  ctx.assertNotEmpty(name, "name can't be empty");

  if (name) user.name = name;
  await user.save();

  ctx.body = { data: await presentUser(ctx, user) };
});

router.post('user.s3Upload', auth(), async ctx => {
  const { filename, kind, size } = ctx.body;
  ctx.assertPresent(filename, 'filename is required');
  ctx.assertPresent(kind, 'kind is required');
  ctx.assertPresent(size, 'size is required');

  const s3Key = uuid.v4();
  const key = `uploads/${ctx.state.user.id}/${s3Key}/${filename}`;
  const policy = makePolicy();
  const endpoint = publicS3Endpoint();

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
        url: `${endpoint}/${key}`,
        name: filename,
        size,
      },
    },
  };
});

export default router;
