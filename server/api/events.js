// @flow
import Router from 'koa-router';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import { presentEvent } from '../presenters';
import { Event, User } from '../models';

const router = new Router();

router.post('events.list', auth(), pagination(), async ctx => {
  let { sort = 'updatedAt', direction } = ctx.body;
  if (direction !== 'ASC') direction = 'DESC';

  const user = ctx.state.user;
  const collectionIds = await user.collectionIds();

  const where = {
    name: Event.ACTIVITY_EVENTS,
    teamId: user.teamId,
    collectionId: collectionIds,
  };

  const events = await Event.findAll({
    where,
    order: [[sort, direction]],
    include: [
      {
        model: User,
        as: 'actor',
      },
    ],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: events.map(presentEvent),
  };
});

export default router;
