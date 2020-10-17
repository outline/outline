// @flow
import Router from "koa-router";
import { escapeRegExp } from "lodash";
import { AuthenticationError, InvalidRequestError } from "../errors";
import {
  Authentication,
  Document,
  User,
  Team,
  Collection,
  SearchQuery,
} from "../models";
import { presentSlackAttachment } from "../presenters";
import * as Slack from "../slack";
const router = new Router();

// triggered by a user posting a getoutline.com link in Slack
// TODO this is not really semantically correct because it's the endpoitn for every event hook, not just unfurl
router.post("hooks.unfurl", async (ctx) => {
  const { challenge, token, event } = ctx.body;
  if (challenge) return (ctx.body = ctx.body.challenge);

  if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
    throw new AuthenticationError("Invalid token");
  }

  const user = await User.findOne({
    where: { service: "slack", serviceId: event.user },
  });
  if (!user) return;

  const auth = await Authentication.findOne({
    where: { service: "slack", teamId: user.teamId },
  });
  if (!auth) return;

  switch (event.type) {
    // handles link unfurl when a link is shared (see https://api.slack.com/reference/messaging/link-unfurling)
    // and also adds backlinks to the document
    //TODO errors seem to get swallowed
    case "link_shared": {
      let unfurls = {};
      for (let link of event.links) {
        // TODO needs to handle share link URLs too
        const id = link.url.substr(link.url.lastIndexOf("/") + 1);
        const doc = await Document.findByPk(id);

        if (!doc || doc.teamId !== user.teamId) continue;

        unfurls[link.url] = {
          title: doc.title,
          text: doc.getSummary(),
          color: doc.collection.color,
        };
      }

      // respond to slack with unfurl data
      await Slack.post("chat.unfurl", {
        token: auth.token,
        channel: event.channel,
        ts: event.message_ts,
        unfurls,
      });

      // get the permalink and message contents to construct a backlink
      // TODO test with private messages, threads and private channels

      await Slack.post("chat.unfurl", {
        token: auth.token,
        channel: event.channel,
        ts: event.message_ts,
        unfurls,
      });

      try {
        const { permalink } = await Slack.request("chat.getPermalink", {
          token: auth.token,
          channel: event.channel,
          message_ts: event.message_ts,
        });

        const { messages } = await Slack.request("conversations.history", {
          token: auth.token,
          channel: event.channel,
          latest: event.message_ts,
          limit: 1,
          inclusive: true,
        });

        const { user } = await Slack.request("users.info", {
          token: auth.token,
          user: messages[0].user,
        });

        console.warn({ event, permalink, messages, user });
        console.log(
          `${user["real_name"]} shared this document on Slack at ${messages[0].ts} with the message ${messages[0].text}`
        );
      } catch (e) {
        console.log({ e });
      }

      break;
    }
    default: {
      console.warn(`unhandled event type #{event.type}`);
    }
  }
});

// triggered by interactions with actions, dialogs, message buttons in Slack
router.post("hooks.interactive", async (ctx) => {
  const { payload } = ctx.body;
  ctx.assertPresent(payload, "payload is required");

  const data = JSON.parse(payload);
  const { callback_id, token } = data;
  ctx.assertPresent(token, "token is required");
  ctx.assertPresent(callback_id, "callback_id is required");

  if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
    throw new AuthenticationError("Invalid verification token");
  }

  const team = await Team.findOne({
    where: { slackId: data.team.id },
  });

  if (!team) {
    ctx.body = {
      text:
        "Sorry, we couldn’t find an integration for your team. Head to your Outline settings to set one up.",
      response_type: "ephemeral",
      replace_original: false,
    };
    return;
  }

  // we find the document based on the users teamId to ensure access
  const document = await Document.findOne({
    where: {
      id: data.callback_id,
      teamId: team.id,
    },
  });
  if (!document) throw new InvalidRequestError("Invalid document");

  const collection = await Collection.findByPk(document.collectionId);

  // respond with a public message that will be posted in the original channel
  ctx.body = {
    response_type: "in_channel",
    replace_original: false,
    attachments: [
      presentSlackAttachment(document, collection, team, document.getSummary()),
    ],
  };
});

// triggered by the /outline command in Slack
router.post("hooks.slack", async (ctx) => {
  const { token, team_id, user_id, text = "" } = ctx.body;
  ctx.assertPresent(token, "token is required");
  ctx.assertPresent(team_id, "team_id is required");
  ctx.assertPresent(user_id, "user_id is required");

  if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
    throw new AuthenticationError("Invalid verification token");
  }

  // Handle "help" command or no input
  if (text.trim() === "help" || !text.trim()) {
    ctx.body = {
      response_type: "ephemeral",
      text: "How to use /outline",
      attachments: [
        {
          text:
            "To search your knowledge base use `/outline keyword`. \nYou’ve already learned how to get help with `/outline help`.",
        },
      ],
    };
    return;
  }

  const team = await Team.findOne({
    where: { slackId: team_id },
  });
  if (!team) {
    ctx.body = {
      response_type: "ephemeral",
      text:
        "Sorry, we couldn’t find an integration for your team. Head to your Outline settings to set one up.",
    };
    return;
  }

  const user = await User.findOne({
    where: {
      teamId: team.id,
      service: "slack",
      serviceId: user_id,
    },
  });

  const options = {
    limit: 5,
  };
  const { results, totalCount } = user
    ? await Document.searchForUser(user, text, options)
    : await Document.searchForTeam(team, text, options);

  SearchQuery.create({
    userId: user ? user.id : null,
    teamId: team.id,
    source: "slack",
    query: text,
    results: totalCount,
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
          result.document.collection,
          team,
          queryIsInTitle ? undefined : result.context,
          process.env.SLACK_MESSAGE_ACTIONS
            ? [
                {
                  name: "post",
                  text: "Post to Channel",
                  type: "button",
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
