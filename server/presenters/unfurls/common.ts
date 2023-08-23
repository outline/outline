import { differenceInMinutes, formatDistanceToNowStrict } from "date-fns";
import { t } from "i18next";
import { dateLocale } from "@shared/utils/date";
import { Document, User, View } from "@server/models";
import { opts } from "@server/utils/i18n";

export const presentLastOnlineInfoFor = (user: User) => {
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

export const presentLastViewedInfoFor = async (
  user: User,
  document: Document
) => {
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

export const presentLastActivityInfoFor = (
  document: Document,
  viewer: User
) => {
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
