import Router from 'koa-router';
import httpErrors from 'http-errors';
import { Document, User } from '../models';

const router = new Router();

router.post('hooks.slack', async ctx => {
  const { token, user_id, text } = ctx.body;
  ctx.assertPresent(token, 'token is required');
  ctx.assertPresent(user_id, 'user_id is required');
  ctx.assertPresent(text, 'text is required');

  if (token !== process.env.SLACK_VERIFICATION_TOKEN)
    throw httpErrors.BadRequest('Invalid token');

  const user = await User.find({
    where: {
      slackId: user_id,
    },
  });

  if (!user) throw httpErrors.BadRequest('Invalid user');

  const documents = await Document.searchForUser(user, text, {
    limit: 5,
  });

  const results = [];
  let number = 1;
  for (const document of documents) {
    results.push(
      `${number}. <${process.env.URL}${document.getUrl()}|${document.title}>`
    );
    number += 1;
  }

  ctx.body = {
    text: 'Search results:',
    attachments: [
      {
        text: results.join('\n'),
        color: '#3AA3E3',
      },
    ],
  };
});

export default router;
