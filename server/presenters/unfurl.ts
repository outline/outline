import { differenceInMinutes, formatDistanceToNowStrict } from "date-fns";
import { t } from "i18next";
import { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { dateLocale } from "@shared/utils/date";
import { Document, User, View } from "@server/models";
import { opts } from "@server/utils/i18n";
import { GitHubUtils } from "plugins/github/shared/GitHubUtils";

async function presentUnfurl(
  data: Record<string, any>,
  options?: { includeEmail: boolean }
) {
  switch (data.type) {
    case UnfurlResourceType.Mention:
      return presentMention(data, options);
    case UnfurlResourceType.Document:
      return presentDocument(data);
    case UnfurlResourceType.PR:
      return presentPR(data);
    case UnfurlResourceType.Issue:
      return presentIssue(data);
    default:
      return presentOEmbed(data);
  }
}

const presentOEmbed = (
  data: Record<string, any>
): UnfurlResponse[UnfurlResourceType.OEmbed] => ({
  type: UnfurlResourceType.OEmbed,
  url: data.url,
  title: data.title,
  description: data.description,
  thumbnailUrl: data.thumbnail_url,
});

const presentMention = async (
  data: Record<string, any>,
  options?: { includeEmail: boolean }
): Promise<UnfurlResponse[UnfurlResourceType.Mention]> => {
  const user: User = data.user;
  const document: Document = data.document;

  const lastOnlineInfo = presentLastOnlineInfoFor(user);
  const lastViewedInfo = await presentLastViewedInfoFor(user, document);

  return {
    type: UnfurlResourceType.Mention,
    name: user.name,
    email: options && options.includeEmail ? user.email : null,
    avatarUrl: user.avatarUrl,
    color: user.color,
    lastActive: `${lastOnlineInfo} • ${lastViewedInfo}`,
  };
};

const presentDocument = (
  data: Record<string, any>
): UnfurlResponse[UnfurlResourceType.Document] => {
  const document: Document = data.document;
  const viewer: User = data.viewer;
  return {
    url: document.url,
    type: UnfurlResourceType.Document,
    id: document.id,
    title: document.titleWithDefault,
    summary: document.getSummary(),
    lastActivityByViewer: presentLastActivityInfoFor(document, viewer),
  };
};

const presentPR = (
  data: Record<string, any>
): UnfurlResponse[UnfurlResourceType.PR] => ({
  url: data.html_url,
  type: UnfurlResourceType.PR,
  id: `#${data.number}`,
  title: data.title,
  description: data.body,
  author: {
    name: data.user.login,
    avatarUrl: data.user.avatar_url,
  },
  state: {
    name: data.merged ? "merged" : data.state,
    color: GitHubUtils.getColorForStatus(data.merged ? "merged" : data.state),
  },
  createdAt: data.created_at,
});

const presentIssue = (
  data: Record<string, any>
): UnfurlResponse[UnfurlResourceType.Issue] => ({
  url: data.html_url,
  type: UnfurlResourceType.Issue,
  id: `#${data.number}`,
  title: data.title,
  description: data.body_text,
  author: {
    name: data.user.login,
    avatarUrl: data.user.avatar_url,
  },
  labels: data.labels.map((label: { name: string; color: string }) => ({
    name: label.name,
    color: `#${label.color}`,
  })),
  state: {
    name: data.state,
    color: GitHubUtils.getColorForStatus(
      data.state === "closed" ? "done" : data.state
    ),
  },
  createdAt: data.created_at,
});

const presentLastOnlineInfoFor = (user: User) => {
  const locale = dateLocale(user.language);

  let info: string;
  if (!user.lastActiveAt) {
    info = t("Never logged in", { ...opts(user) });
  } else if (differenceInMinutes(new Date(), user.lastActiveAt) < 5) {
    info = t("Online now", { ...opts(user) });
  } else {
    info = t("Online {{ timeAgo }}", {
      timeAgo: formatDistanceToNowStrict(user.lastActiveAt, {
        addSuffix: true,
        locale,
      }),
      ...opts(user),
    });
  }

  return info;
};

const presentLastViewedInfoFor = async (user: User, document: Document) => {
  const lastView = await View.findOne({
    where: {
      userId: user.id,
      documentId: document.id,
    },
    order: [["updatedAt", "DESC"]],
  });
  const lastViewedAt = lastView ? lastView.updatedAt : undefined;
  const locale = dateLocale(user.language);

  let info: string;
  if (!lastViewedAt) {
    info = t("Never viewed", { ...opts(user) });
  } else if (differenceInMinutes(new Date(), lastViewedAt) < 5) {
    info = t("Viewed just now", { ...opts(user) });
  } else {
    info = t("Viewed {{ timeAgo }}", {
      timeAgo: formatDistanceToNowStrict(lastViewedAt, {
        addSuffix: true,
        locale,
      }),
      ...opts(user),
    });
  }

  return info;
};

const presentLastActivityInfoFor = (document: Document, viewer: User) => {
  const locale = dateLocale(viewer.language);
  const wasUpdated = document.createdAt !== document.updatedAt;

  let info: string;
  if (wasUpdated) {
    const lastUpdatedByViewer = document.updatedBy.id === viewer.id;
    if (lastUpdatedByViewer) {
      info = t("You updated {{ timeAgo }}", {
        timeAgo: formatDistanceToNowStrict(document.updatedAt, {
          addSuffix: true,
          locale,
        }),
        ...opts(viewer),
      });
    } else {
      info = t("{{ user }} updated {{ timeAgo }}", {
        user: document.updatedBy.name,
        timeAgo: formatDistanceToNowStrict(document.updatedAt, {
          addSuffix: true,
          locale,
        }),
        ...opts(viewer),
      });
    }
  } else {
    const lastCreatedByViewer = document.createdById === viewer.id;
    if (lastCreatedByViewer) {
      info = t("You created {{ timeAgo }}", {
        timeAgo: formatDistanceToNowStrict(document.createdAt, {
          addSuffix: true,
          locale,
        }),
        ...opts(viewer),
      });
    } else {
      info = t("{{ user }} created {{ timeAgo }}", {
        user: document.createdBy.name,
        timeAgo: formatDistanceToNowStrict(document.createdAt, {
          addSuffix: true,
          locale,
        }),
        ...opts(viewer),
      });
    }
  }

  return info;
};

export default presentUnfurl;
