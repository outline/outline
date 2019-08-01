// @flow
import Router from 'koa-router';
import { escapeRegExp } from 'lodash';
import { AuthenticationError, InvalidRequestError } from '../errors';
import { Authentication, Document, User, Team } from '../models';
import { presentSlackAttachment } from '../presenters';
import * as Slack from '../slack';
const router = new Router();

// triggered by a user posting a getoutline.com link in Slack
router.post('hooks.unfurl', async ctx => {
  const { challenge, token, event } = ctx.body;
  if (challenge) return (ctx.body = ctx.body.challenge);

  if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
    throw new AuthenticationError('Invalid token');
  }

  const user = await User.findOne({
    where: { service: 'slack', serviceId: event.user },
  });
  if (!user) return;

  const auth = await Authentication.findOne({
    where: { service: 'slack', teamId: user.teamId },
  });
  if (!auth) return;

  // get content for unfurled links
  let unfurls = {};
  for (let link of event.links) {
    const id = link.url.substr(link.url.lastIndexOf('/') + 1);
    const doc = await Document.findByPk(id);
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

// triggered by interactions with actions, dialogs, message buttons in Slack
router.post('hooks.interactive', async ctx => {
  const { payload } = ctx.body;
  ctx.assertPresent(payload, 'payload is required');

  const data = JSON.parse(payload);
  const { callback_id, token } = data;
  ctx.assertPresent(token, 'token is required');
  ctx.assertPresent(callback_id, 'callback_id is required');

  if (token !== process.env.SLACK_VERIFICATION_TOKEN)
    throw new AuthenticationError('Invalid verification token');

  const user = await User.findOne({
    where: { service: 'slack', serviceId: data.user.id },
  });
  if (!user) {
    ctx.body = {
      text: 'Sorry, we couldn’t find your user on this team in Outline.',
      response_type: 'ephemeral',
      replace_original: false,
    };
    return;
  }

  // we find the document based on the users teamId to ensure access
  const document = await Document.findOne({
    where: { id: data.callback_id, teamId: user.teamId },
  });
  if (!document) throw new InvalidRequestError('Invalid document');

  const team = await Team.findByPk(user.teamId);

  // respond with a public message that will be posted in the original channel
  ctx.body = {
    response_type: 'in_channel',
    replace_original: false,
    attachments: [
      presentSlackAttachment(document, team, document.getSummary()),
    ],
  };
});

// triggered by the /outline command in Slack
router.post('hooks.slack', async ctx => {
  const { token, user_id, text } = ctx.body;
  ctx.assertPresent(token, 'token is required');
  ctx.assertPresent(user_id, 'user_id is required');

  if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
    throw new AuthenticationError('Invalid verification token');
  }

  // Handle "help" command or no input
  if (text.trim() === 'help' || !text.trim()) {
    ctx.body = {
      response_type: 'ephemeral',
      text: 'How to use /outline',
      attachments: [
        {
          text:
            'To search your knowledgebase use `/outline keyword`. \nYou’ve already learned how to get help with `/outline help`.',
        },
      ],
    };
    return;
  }

  const user = await User.findOne({
    where: {
      service: 'slack',
      serviceId: user_id,
    },
  });
  if (!user) {
    ctx.body = {
      response_type: 'ephemeral',
      text: 'Sorry, we couldn’t find your user – have you signed into Outline?',
    };
    return;
  }

  const team = await Team.findByPk(user.teamId);
  const results = await Document.searchForUser(user, text, {
    limit: 5,
  });

  if (results.length) {
    const attachments = [];
    for (const result of results) {
      const queryIsInTitle = !!result.document.title
        .toLowerCase()
        .match(escapeRegExp(text.toLowerCase()));

      attachments.push(
        presentSlackAttachment(
          result.document,
          team,
          queryIsInTitle ? undefined : result.context,
          process.env.SLACK_MESSAGE_ACTIONS
            ? [
                {
                  name: 'post',
                  text: 'Post to Channel',
                  type: 'button',
                  value: result.document.id,
                },
              ]
            : undefined
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
