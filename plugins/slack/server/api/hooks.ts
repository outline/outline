import { t } from "i18next";
import Router from "koa-router";
import escapeRegExp from "lodash/escapeRegExp";
import { Op } from "sequelize";
import { IntegrationService } from "@shared/types";
import env from "@server/env";
import { AuthenticationError, InvalidRequestError } from "@server/errors";
import Logger from "@server/logging/Logger";
import {
  UserAuthentication,
  AuthenticationProvider,
  Document,
  User,
  Team,
  SearchQuery,
  Integration,
  IntegrationAuthentication,
} from "@server/models";
import SearchHelper from "@server/models/helpers/SearchHelper";
import { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";
import { opts } from "@server/utils/i18n";
import { assertPresent } from "@server/validation";
import presentMessageAttachment from "../presenters/messageAttachment";
import * as Slack from "../slack";

const router = new Router();

function verifySlackToken(token: string) {
  if (!env.SLACK_VERIFICATION_TOKEN) {
    throw AuthenticationError(
      "SLACK_VERIFICATION_TOKEN is not present in environment"
    );
  }

  if (!safeEqual(env.SLACK_VERIFICATION_TOKEN, token)) {
    throw AuthenticationError("Invalid token");
  }
}

// triggered by a user posting a getoutline.com link in Slack
router.post("hooks.unfurl", async (ctx: APIContext) => {
  const { challenge, token, event } = ctx.request.body;

  // See URL verification handshake documentation on this page:
  // https://api.slack.com/apis/connections/events-api
  if (challenge) {
    ctx.body = {
      challenge,
    };
    return;
  }

  assertPresent(token, "token is required");
  verifySlackToken(token);

  const user = await User.findOne({
    include: [
      {
        where: {
          providerId: event.user,
        },
        model: UserAuthentication,
        as: "authentications",
        required: true,
        separate: true,
      },
    ],
  });
  if (!user) {
    return;
  }
  const auth = await IntegrationAuthentication.findOne({
    where: {
      service: IntegrationService.Slack,
      teamId: user.teamId,
    },
  });
  if (!auth) {
    return;
  }
  // get content for unfurled links
  const unfurls = {};

  for (const link of event.links) {
    const id = link.url.slice(link.url.lastIndexOf("/") + 1);
    const doc = await Document.findByPk(id);
    if (!doc || doc.teamId !== user.teamId) {
      continue;
    }
    unfurls[link.url] = {
      title: doc.title,
      text: doc.getSummary(),
      color: doc.collection?.color,
    };
  }

  await Slack.post("chat.unfurl", {
    token: auth.token,
    channel: event.channel,
    ts: event.message_ts,
    unfurls,
  });

  ctx.body = {
    success: true,
  };
});

// triggered by interactions with actions, dialogs, message buttons in Slack
router.post("hooks.interactive", async (ctx: APIContext) => {
  const { payload } = ctx.request.body;
  assertPresent(payload, "payload is required");

  const data = JSON.parse(payload);
  const { callback_id, token } = data;

  assertPresent(token, "token is required");
  assertPresent(callback_id, "callback_id is required");
  verifySlackToken(token);

  // we find the document based on the users teamId to ensure access
  const document = await Document.scope("withCollection").findByPk(
    data.callback_id
  );

  if (!document) {
    throw InvalidRequestError("Invalid callback_id");
  }

  const team = await Team.findByPk(document.teamId, { rejectOnEmpty: true });

  // respond with a public message that will be posted in the original channel
  ctx.body = {
    response_type: "in_channel",
    replace_original: false,
    attachments: [
      presentMessageAttachment(
        document,
        team,
        document.collection,
        document.getSummary()
      ),
    ],
  };
});

// triggered by the /outline command in Slack
router.post("hooks.slack", async (ctx: APIContext) => {
  const { token, team_id, user_id, text = "" } = ctx.request.body;
  assertPresent(token, "token is required");
  assertPresent(team_id, "team_id is required");
  assertPresent(user_id, "user_id is required");
  verifySlackToken(token);

  let user, team;

  // attempt to find the corresponding team for this request based on the team_id
  team = await Team.findOne({
    include: [
      {
        where: {
          name: "slack",
          providerId: team_id,
          enabled: true,
        },
        as: "authenticationProviders",
        model: AuthenticationProvider,
        required: true,
      },
    ],
  });

  if (team) {
    const authentication = await UserAuthentication.findOne({
      where: {
        providerId: user_id,
      },
      include: [
        {
          where: {
            teamId: team.id,
          },
          model: User,
          as: "user",
          required: true,
        },
      ],
    });

    if (authentication) {
      user = authentication.user;
    }
  } else {
    // If we couldn't find a team it's still possible that the request is from
    // a team that authenticated with a different service, but connected Slack
    // via integration
    const integration = await Integration.findOne({
      where: {
        service: IntegrationService.Slack,
        settings: {
          serviceTeamId: team_id,
        },
      },
      include: [
        {
          model: Team,
          as: "team",
        },
      ],
    });

    if (integration) {
      team = integration.team;
    }
  }

  // Handle "help" command or no input
  if (text.trim() === "help" || !text.trim()) {
    ctx.body = {
      response_type: "ephemeral",
      text: t("How to use {{ command }}", {
        command: "/outline",
        ...opts(user),
      }),
      attachments: [
        {
          text: t(
            "To search your knowledgebase use {{ command }}. \nYou’ve already learned how to get help with {{ command2 }}.",
            {
              command: `/outline keyword`,
              command2: `/outline help`,
              ...opts(user),
            }
          ),
        },
      ],
    };
    return;
  }

  // This should be super rare, how does someone end up being able to make a valid
  // request from Slack that connects to no teams in Outline.
  if (!team) {
    ctx.body = {
      response_type: "ephemeral",
      text: t(
        `Sorry, we couldn’t find an integration for your team. Head to your {{ appName }} settings to set one up.`,
        {
          ...opts(user),
          appName: env.APP_NAME,
        }
      ),
    };
    return;
  }

  // Try to find the user by matching the email address if it is confirmed on
  // Slack's side. It's always trusted on our side as it is only updatable
  // through the authentication provider.
  if (!user) {
    const auth = await IntegrationAuthentication.findOne({
      where: {
        scopes: { [Op.contains]: ["identity.email"] },
        service: IntegrationService.Slack,
        teamId: team.id,
      },
    });

    if (auth) {
      try {
        const response = await Slack.request("users.info", {
          token: auth.token,
          user: user_id,
        });

        if (response.user.is_email_confirmed && response.user.profile.email) {
          user = await User.findOne({
            where: {
              email: response.user.profile.email,
              teamId: team.id,
            },
          });
        }
      } catch (err) {
        // Old connections do not have the correct permissions to access user info
        // so errors here are expected.
        Logger.info(
          "utils",
          "Failed requesting users.info from Slack, the Slack integration should be reconnected.",
          {
            teamId: auth.teamId,
          }
        );
      }
    }
  }

  const options = {
    limit: 5,
  };

  // If we were able to map the request to a user then we can use their permissions
  // to load more documents based on the collections they have access to. Otherwise
  // just a generic search against team-visible documents is allowed.
  const { results, totalCount } = user
    ? await SearchHelper.searchForUser(user, text, options)
    : await SearchHelper.searchForTeam(team, text, options);

  void SearchQuery.create({
    userId: user ? user.id : null,
    teamId: team.id,
    source: "slack",
    query: text,
    results: totalCount,
  }).catch((err) => {
    Logger.error("Failed to create search query", err);
  });

  const haventSignedIn = t(
    `It looks like you haven’t signed in to {{ appName }} yet, so results may be limited`,
    {
      ...opts(user),
      appName: env.APP_NAME,
    }
  );

  // Map search results to the format expected by the Slack API
  if (results.length) {
    const attachments = [];

    for (const result of results) {
      const queryIsInTitle = !!result.document.title
        .toLowerCase()
        .match(escapeRegExp(text.toLowerCase()));
      attachments.push(
        presentMessageAttachment(
          result.document,
          team,
          result.document.collection,
          queryIsInTitle ? undefined : result.context,
          env.SLACK_MESSAGE_ACTIONS
            ? [
                {
                  name: "post",
                  text: t("Post to Channel", opts(user)),
                  type: "button",
                  value: result.document.id,
                },
              ]
            : undefined
        )
      );
    }

    ctx.body = {
      text: user
        ? t(`This is what we found for "{{ term }}"`, {
            ...opts(user),
            term: text,
          })
        : t(`This is what we found for "{{ term }}"`, {
            term: text,
          }) + ` (${haventSignedIn})…`,
      attachments,
    };
  } else {
    ctx.body = {
      text: user
        ? t(`No results for "{{ term }}"`, {
            ...opts(user),
            term: text,
          })
        : t(`No results for "{{ term }}"`, { term: text }) +
          ` (${haventSignedIn})…`,
    };
  }
});

export default router;
