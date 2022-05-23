import { formatDistanceToNow } from "date-fns";
import { sortBy } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import ListItem from "~/components/List/Item";
import PaginatedList from "~/components/PaginatedList";
import useStores from "~/hooks/useStores";

type Props = {
  document: Document;
  isOpen?: boolean;
};

function DocumentViews({ document, isOpen }: Props) {
  const { t } = useTranslation();
  const { views, presence } = useStores();
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
    (view) => !presentIds.includes(view.user.id)
  );
  const users = React.useMemo(() => sortedViews.map((v) => v.user), [
    sortedViews,
  ]);

  return (
    <>
      {isOpen && (
        <PaginatedList
          aria-label={t("Viewers")}
          items={users}
          renderItem={(item: User) => {
            const view = documentViews.find((v) => v.user.id === item.id);
            const isPresent = presentIds.includes(item.id);
            const isEditing = editingIds.includes(item.id);
            const subtitle = isPresent
              ? isEditing
                ? t("Currently editing")
                : t("Currently viewing")
              : t("Viewed {{ timeAgo }} ago", {
                  timeAgo: formatDistanceToNow(
                    view ? Date.parse(view.lastViewedAt) : new Date()
                  ),
                });
            return (
              <ListItem
                key={item.id}
                title={item.name}
                subtitle={subtitle}
                image={<Avatar key={item.id} src={item.avatarUrl} size={32} />}
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
