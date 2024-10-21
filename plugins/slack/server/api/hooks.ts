import { t } from "i18next";
import Router from "koa-router";
import escapeRegExp from "lodash/escapeRegExp";
import queryString from "query-string";
import { z } from "zod";
import { IntegrationService, IntegrationType } from "@shared/types";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import {
  AuthenticationError,
  InvalidRequestError,
  ValidationError,
} from "@server/errors";
import Logger from "@server/logging/Logger";
import validate from "@server/middlewares/validate";
import {
  UserAuthentication,
  Document,
  User,
  Team,
  SearchQuery,
  Integration,
  IntegrationAuthentication,
  AuthenticationProvider,
  Comment,
} from "@server/models";
import SearchHelper from "@server/models/helpers/SearchHelper";
import { can } from "@server/policies";
import { APIContext } from "@server/types";
import { safeEqual } from "@server/utils/crypto";
import { opts } from "@server/utils/i18n";
import env from "../env";
import { presentMessageAttachment } from "../presenters/messageAttachment";
import { presentUserNotLinkedBlocks } from "../presenters/userNotLinkedBlocks";
import * as Slack from "../slack";
import * as T from "./schema";

const router = new Router();

// triggered by a user posting a getoutline.com link in Slack
router.post(
  "hooks.unfurl",
  validate(T.HooksUnfurlSchema),
  async (ctx: APIContext<T.HooksUnfurlReq>) => {
    // See URL verification handshake documentation on this page:
    // https://api.slack.com/apis/connections/events-api
    if ("challenge" in ctx.input.body) {
      ctx.body = {
        challenge: ctx.input.body.challenge,
      };
      return;
    }

    const { token, team_id, event } = ctx.input.body;
    verifySlackToken(token);

    const user = await findUserForRequest(team_id, event.user);
    if (!user) {
      Logger.debug("plugins", "No user found for Slack user ID", {
        providerId: event.user,
      });
      return;
    }

    const auth = await IntegrationAuthentication.findOne({
      where: {
        service: IntegrationService.Slack,
        teamId: user.teamId,
      },
    });

    if (!auth) {
      Logger.debug(
        "plugins",
        "No Slack integration authentication found for team",
        {
          teamId: user.teamId,
        }
      );
      return;
    }
    // get content for unfurled links
    const unfurls: Record<
      string,
      { title: string; text: string; color?: string | undefined }
    > = {};

    for (const link of event.links) {
      const documentId = parseDocumentSlug(link.url);
      if (documentId) {
        const doc = await Document.findByPk(documentId, { userId: user.id });

        if (doc && can(user, "read", doc)) {
          const commentId = queryString.parse(
            link.url.split("?")[1]
          )?.commentId;

          if (commentId) {
            const comment = await Comment.findByPk(commentId as string);
            if (!comment) {
              continue;
            }

            unfurls[link.url] = {
              title: t(`Comment by {{ author }} on "{{ title }}"`, {
                author: comment.createdBy.name,
                title: doc.title,
                ...opts(user),
              }),
              text: comment.toPlainText(),
            };
          } else {
            unfurls[link.url] = {
              title: doc.title,
              text: doc.getSummary(),
              color: doc.collection?.color ?? undefined,
            };
          }
        }
      }
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
  }
);

// triggered by interactions with actions, dialogs, message buttons in Slack
router.post(
  "hooks.interactive",
  validate(T.HooksInteractiveSchema),
  async (ctx: APIContext<T.HooksInteractiveReq>) => {
    const { payload } = ctx.input.body;
    let callback_id, token;

    try {
      // https://api.slack.com/interactivity/handling#payloads
      const data = JSON.parse(payload);

      const parsed = z
        .object({
          type: z.string(),
          callback_id: z.string(),
          token: z.string(),
        })
        .parse(data);

      callback_id = parsed.callback_id;
      token = parsed.token;
    } catch (err) {
      Logger.error("Failed to parse Slack interactive payload", err, {
        payload,
      });
      throw ValidationError("Invalid payload");
    }

    verifySlackToken(token);

    // we find the document based on the users teamId to ensure access
    const document = await Document.scope("withCollection").findByPk(
      callback_id
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
  }
);

// triggered by the /outline command in Slack
router.post(
  "hooks.slack",
  validate(T.HooksSlackCommandSchema),
  async (ctx: APIContext<T.HooksSlackCommandReq>) => {
    const { token, team_id, user_id, text } = ctx.input.body;
    verifySlackToken(token);

    const user = await findUserForRequest(team_id, user_id);

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
              "To search your workspace use {{ command }}. \nType {{ command2 }} help to display this help text.",
              {
                command: `/outline keyword`,
                command2: `/outline`,
                ...opts(user),
              }
            ),
          },
        ],
      };
      return;
    }

    const options = {
      query: text,
      limit: 5,
    };

    if (!user) {
      const team = await findTeamForRequest(team_id);

      ctx.body = {
        response_type: "ephemeral",
        blocks: presentUserNotLinkedBlocks(team),
      };
      return;
    }

    const { results, total } = await SearchHelper.searchForUser(user, options);

    await SearchQuery.create({
      userId: user ? user.id : null,
      teamId: user.teamId,
      source: "slack",
      query: text,
      results: total,
    });

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
            user.team,
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
        text: t(`This is what we found for "{{ term }}"`, {
          ...opts(user),
          term: text,
        }),
        attachments,
      };
    } else {
      ctx.body = {
        text: t(`No results for "{{ term }}"`, {
          ...opts(user),
          term: text,
        }),
      };
    }
  }
);

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

/**
 * Find a matching team for the given Slack team ID
 *
 * @param serviceTeamId The Slack team ID
 * @returns A promise resolving to a matching team, if found
 */
async function findTeamForRequest(
  serviceTeamId: string
): Promise<Team | undefined> {
  const authenticationProvider = await AuthenticationProvider.findOne({
    where: {
      name: "slack",
      providerId: serviceTeamId,
    },
    include: [
      {
        required: true,
        model: Team,
        as: "team",
      },
    ],
  });

  if (authenticationProvider) {
    return authenticationProvider.team;
  }

  const integration = await Integration.findOne({
    where: {
      service: IntegrationService.Slack,
      type: IntegrationType.LinkedAccount,
      settings: {
        slack: {
          serviceTeamId,
        },
      },
    },
    include: [
      {
        model: Team,
        as: "team",
        required: true,
      },
    ],
  });

  if (integration) {
    return integration.team;
  }

  return;
}

/**
 * Find a matching user for the given Slack team and user ID
 *
 * @param serviceTeamId The Slack team ID
 * @param serviceUserId The Slack user ID
 * @returns A promise resolving to a matching user, if found
 */
async function findUserForRequest(
  serviceTeamId: string,
  serviceUserId: string
): Promise<User | undefined> {
  // Prefer explicit linked account
  const integration = await Integration.findOne({
    where: {
      service: IntegrationService.Slack,
      type: IntegrationType.LinkedAccount,
      settings: {
        slack: {
          serviceTeamId,
          serviceUserId,
        },
      },
    },
    include: [
      {
        model: User,
        as: "user",
        required: true,
      },
      {
        model: Team,
        as: "team",
        required: true,
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  if (integration) {
    integration.user.team = integration.team;
    return integration.user;
  }

  // Fallback to authentication provider if the user has Slack sign-in
  const user = await User.findOne({
    include: [
      {
        where: {
          providerId: serviceUserId,
        },
        order: [["createdAt", "DESC"]],
        model: UserAuthentication,
        as: "authentications",
        required: true,
      },
      {
        model: Team,
        as: "team",
        required: true,
      },
    ],
  });

  if (user) {
    return user;
  }

  return;
}

export default router;
