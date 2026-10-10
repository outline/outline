import { differenceInMinutes, formatDistanceToNowStrict } from "date-fns";
import { t } from "i18next";
import type { UnfurlResponse } from "@shared/types";
import { UnfurlResourceType } from "@shared/types";
import { dateLocale } from "@shared/utils/date";
import type { Document, User, Group } from "@server/models";
import { View } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { opts } from "@server/utils/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous payload from internal callers and third-party unfurl plugins.
type UnfurlData = Record<string, any>;

interface UnfurlOptions {
  /** Whether the mentioned user's email may be included in the response. */
  includeEmail: boolean;
  /** Whether the mentioned user's viewing activity may be included in the response. */
  includeLastViewed: boolean;
}

async function presentUnfurl(data: UnfurlData, options?: UnfurlOptions) {
  switch (data.type) {
    case UnfurlResourceType.Mention:
      return presentMention(data, options);
    case UnfurlResourceType.Group:
      return presentGroup(data);
    case UnfurlResourceType.Document:
      return presentDocument(data);
    case UnfurlResourceType.PR:
      return presentPR(data);
    case UnfurlResourceType.Issue:
      return presentIssue(data);
    case UnfurlResourceType.Project:
      return presentProject(data);
    default:
      return presentURL(data);
  }
}

// The data will have been transformed by the unfurl plugin, fields are picked
// individually so that additional metadata is never exposed in the response.
const presentURL = (
  data: UnfurlData
): UnfurlResponse[UnfurlResourceType.URL] => ({
  type: UnfurlResourceType.URL,
  url: data.url,
  title: data.title,
  description: data.description,
  color: data.color,
  thumbnailUrl: data.thumbnailUrl,
  faviconUrl: data.faviconUrl,
});

const presentMention = async (
  data: UnfurlData,
  options?: UnfurlOptions
): Promise<UnfurlResponse[UnfurlResourceType.Mention]> => {
  const user: User = data.user;
  const document: Document = data.document;

  const lastOnlineInfo = presentLastOnlineInfoFor(user);
  const lastViewedInfo =
    options && options.includeLastViewed
      ? await presentLastViewedInfoFor(user, document)
      : undefined;

  return {
    type: UnfurlResourceType.Mention,
    name: user.name,
    email: options && options.includeEmail ? user.email : null,
    avatarUrl: user.avatarUrl,
    color: user.color,
    lastActive: lastViewedInfo
      ? `${lastOnlineInfo} • ${lastViewedInfo}`
      : lastOnlineInfo,
  };
};

const presentGroup = async (
  data: UnfurlData
): Promise<UnfurlResponse[UnfurlResourceType.Group]> => {
  const group: Group = data.group;
  const memberCount = await group.memberCount;

  return {
    type: UnfurlResourceType.Group,
    name: group.name,
    description: group.description,
    memberCount,
    users: (data.users as User[]).map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      color: user.color,
    })),
  };
};

const presentDocument = (
  data: UnfurlData
): UnfurlResponse[UnfurlResourceType.Document] => {
  const document: Document = data.document;
  const viewer: User | undefined = data.viewer;
  const url: string | undefined = data.url;
  const anchor: string | undefined = data.anchor;

  // When the URL targets a specific heading, preview the content of that
  // section rather than the top of the document.
  const sectionSummary = anchor
    ? DocumentHelper.getAnchorContent(document, anchor)
    : undefined;

  return {
    url: url ?? `${document.url}${anchor ?? ""}`,
    type: UnfurlResourceType.Document,
    id: document.id,
    title: document.titleWithDefault,
    summary: sectionSummary || document.getSummary(),
    lastActivityByViewer: viewer
      ? presentLastActivityInfoFor(document, viewer)
      : undefined,
  };
};

const presentPR = (data: UnfurlData): UnfurlResponse[UnfurlResourceType.PR] =>
  data as UnfurlResponse[UnfurlResourceType.PR]; // this would have been transformed by the unfurl plugin.

const presentIssue = (
  data: UnfurlData
): UnfurlResponse[UnfurlResourceType.Issue] =>
  data as UnfurlResponse[UnfurlResourceType.Issue]; // this would have been transformed by the unfurl plugin.

const presentProject = (
  data: UnfurlData
): UnfurlResponse[UnfurlResourceType.Project] =>
  data as UnfurlResponse[UnfurlResourceType.Project]; // this would have been transformed by the unfurl plugin.

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
