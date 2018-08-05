// @flow
import Router from 'koa-router';
import { AuthenticationError, InvalidRequestError } from '../errors';
import { Authentication, Document, User } from '../models';
import { presentSlackAttachment } from '../presenters';
import * as Slack from '../slack';
const router = new Router();

router.post('hooks.unfurl', async ctx => {
  const { challenge, token, event } = ctx.body;
  if (challenge) return (ctx.body = ctx.body.challenge);

  if (token !== process.env.SLACK_VERIFICATION_TOKEN)
    throw new AuthenticationError('Invalid token');

  // TODO: Everything from here onwards will get moved to an async job
  const user = await User.find({
    where: { service: 'slack', serviceId: event.user },
  });
  if (!user) return;

  const auth = await Authentication.find({
    where: { service: 'slack', teamId: user.teamId },
  });
  if (!auth) return;

  // get content for unfurled links
  let unfurls = {};
  for (let link of event.links) {
    const id = link.url.substr(link.url.lastIndexOf('/') + 1);
    const doc = await Document.findById(id);
    if (!doc || doc.teamId !== user.teamId) continue;

    unfurls[link.url] = {
      title: doc.title,
      text: doc.getSummary(),
      color: doc.collection.color,
    };
  }

  await Slack.post('chat.unfurl', {
    token: auth.token,
    channel: event.channel,
    ts: event.message_ts,
    unfurls,
  });
});

router.post('hooks.slack', async ctx => {
  const { token, user_id, text } = ctx.body;
  ctx.assertPresent(token, 'token is required');
  ctx.assertPresent(user_id, 'user_id is required');
  ctx.assertPresent(text, 'text is required');

  if (token !== process.env.SLACK_VERIFICATION_TOKEN)
    throw new AuthenticationError('Invalid token');

  const user = await User.find({
    where: {
      service: 'slack',
      serviceId: user_id,
    },
  });

  if (!user) throw new InvalidRequestError('Invalid user');

  const results = await Document.searchForUser(user, text, {
    limit: 5,
  });

  if (results.length) {
    const attachments = [];
    for (const result of results) {
      const queryIsInTitle = !!result.document.title
        .toLowerCase()
        .match(text.toLowerCase());

      attachments.push(
        presentSlackAttachment(
          result.document,
          queryIsInTitle ? undefined : result.context
        )
      );
    }

    ctx.body = {
      text: `This is what we found for "${text}"…`,
      attachments,
    };
  } else {
    ctx.body = {
      text: `No results for "${text}"`,
    };
  }
});

export default router;
