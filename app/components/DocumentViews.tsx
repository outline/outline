import compact from "lodash/compact";
import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { dateLocale, dateToRelative } from "@shared/utils/date";
import Document from "~/models/Document";
import User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import ListItem from "~/components/List/Item";
import PaginatedList from "~/components/PaginatedList";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type Props = {
  document: Document;
  isOpen?: boolean;
};

function DocumentViews({ document, isOpen }: Props) {
  const { t } = useTranslation();
  const { views, presence } = useStores();
  const user = useCurrentUser();
  const locale = dateLocale(user.language);

  const documentPresence = presence.get(document.id);
  const documentPresenceArray = documentPresence
    ? Array.from(documentPresence.values())
    : [];
  const presentIds = documentPresenceArray.map((p) => p.userId);
  const editingIds = documentPresenceArray
    .filter((p) => p.isEditing)
    .map((p) => p.userId);

  // ensure currently present via websocket are always ordered first
  const documentViews = views.inDocument(document.id);
  const sortedViews = sortBy(
    documentViews,
    (view) => !presentIds.includes(view.userId)
  );
  const users = useMemo(
    () => compact(sortedViews.map((v) => v.user)),
    [sortedViews]
  );

  return (
    <>
      {isOpen && (
        <PaginatedList<User>
          aria-label={t("Viewers")}
          items={users}
          renderItem={(model) => {
            const view = documentViews.find((v) => v.userId === model.id);
            const isPresent = presentIds.includes(model.id);
            const isEditing = editingIds.includes(model.id);
            const subtitle = isPresent
              ? isEditing
                ? t("Currently editing")
                : t("Currently viewing")
              : t("Viewed {{ timeAgo }}", {
                  timeAgo: dateToRelative(
                    view ? Date.parse(view.lastViewedAt) : new Date(),
                    {
                      addSuffix: true,
                      locale,
                    }
                  ),
                });
            return (
              <ListItem
                key={model.id}
                title={model.name}
                subtitle={subtitle}
                image={
                  <Avatar
                    key={model.id}
                    model={model}
                    size={AvatarSize.Large}
                  />
                }
                border={false}
                small
              />
            );
          }}
        />
      )}
    </>
  );
}

export default observer(DocumentViews);
