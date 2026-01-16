import { differenceInMinutes, formatDistanceToNowStrict } from "date-fns";
import { t } from "i18next";
import type { UnfurlResponse } from "@shared/types";
import { UnfurlResourceType } from "@shared/types";
import { dateLocale } from "@shared/utils/date";
import type { Document, User, Group } from "@server/models";
import { View } from "@server/models";
import { opts } from "@server/utils/i18n";

async function presentUnfurl(
  data: Record<string, any>,
  options?: { includeEmail: boolean }
) {
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
    default:
      return presentURL(data);
  }
}

const presentURL = (
  data: Record<string, any>
): UnfurlResponse[UnfurlResourceType.URL] => {
  // TODO: For backwards compatibility, remove once cache has expired in next release.
  if (data.transformedUnfurl) {
    delete data.transformedUnfurl;
    return data as UnfurlResponse[UnfurlResourceType.URL]; // this would have been transformed by the unfurl plugin.
  }

  return {
    type: UnfurlResourceType.URL,
    url: data.url,
    title: data.meta.title,
    description: data.meta.description,
    thumbnailUrl: (data.links.thumbnail ?? [])[0]?.href ?? "",
    faviconUrl: (data.links.icon ?? [])[0]?.href ?? "",
  };
};

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

const presentGroup = async (
  data: Record<string, any>
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
): UnfurlResponse[UnfurlResourceType.PR] =>
  data as UnfurlResponse[UnfurlResourceType.PR]; // this would have been transformed by the unfurl plugin.

const presentIssue = (
  data: Record<string, any>
): UnfurlResponse[UnfurlResourceType.Issue] =>
  data as UnfurlResponse[UnfurlResourceType.Issue]; // this would have been transformed by the unfurl plugin.

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
