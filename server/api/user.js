import uuid from 'uuid';
import Router from 'koa-router';

import {
  makePolicy,
  signPolicy,
} from '../utils/s3';
import auth from './authentication';
import { presentUser } from '../presenters';
import { User } from '../models';

const router = new Router();

router.post('user.info', auth(), async (ctx) => {
  ctx.body = { data: await presentUser(ctx.state.user) };
});

router.post('user.s3Upload', auth(), async (ctx) => {
  let { filename, kind, size } = ctx.body;
  ctx.assertPresent(filename, 'filename is required');
  ctx.assertPresent(kind, 'kind is required');
  ctx.assertPresent(size, 'size is required');

  const s3Key = uuid.v4();
  const key = `${s3Key}/${filename}`;
  const policy = makePolicy();

  ctx.body = { data: {
    max_upload_size:          process.env.AWS_S3_UPLOAD_MAX_SIZE,
    upload_url:               process.env.AWS_S3_UPLOAD_BUCKET_URL,
    form: {
      AWSAccessKeyId:       process.env.AWS_ACCESS_KEY_ID,
      "Cache-Control":      "max-age=31557600",
      "Content-Type":       kind,
      key:                  key,
      acl:                  "public-read",
      signature:            signPolicy(policy),
      policy:               policy,
    },
    asset: {
      content_type:         kind,
      url:                  `${process.env.AWS_S3_UPLOAD_BUCKET_URL}${s3Key}/${filename}`,
      name:                 filename,
      size:                 size,
    },
  }};
});

export default router;
