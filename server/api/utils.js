// @flow
import Router from 'koa-router';
import subDays from 'date-fns/sub_days';
import { AuthenticationError } from '../errors';
import { Document } from '../models';
import { Op } from '../sequelize';

const router = new Router();

router.post('utils.gc', async ctx => {
  const { token } = ctx.body;

  if (process.env.UTILS_SECRET !== token) {
    throw new AuthenticationError('Invalid secret token');
  }

  await Document.scope('withUnpublished').destroy({
    where: {
      deletedAt: {
        [Op.lt]: subDays(new Date(), 30),
      },
    },
    force: true,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
