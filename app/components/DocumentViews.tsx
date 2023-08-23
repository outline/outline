import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { dateToRelative } from "@shared/utils/date";
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
  const users = React.useMemo(
    () => sortedViews.map((v) => v.user),
    [sortedViews]
  );

  return (
    <>
      {isOpen && (
        <PaginatedList
          aria-label={t("Viewers")}
          items={users}
          renderItem={(model: User) => {
            const view = documentViews.find((v) => v.user.id === model.id);
            const isPresent = presentIds.includes(model.id);
            const isEditing = editingIds.includes(model.id);
            const subtitle = isPresent
              ? isEditing
                ? t("Currently editing")
                : t("Currently viewing")
              : t("Viewed {{ timeAgo }} ago", {
                  timeAgo: dateToRelative(
                    view ? Date.parse(view.lastViewedAt) : new Date()
                  ),
                });
            return (
              <ListItem
                key={model.id}
                title={model.name}
                subtitle={subtitle}
                image={<Avatar key={model.id} model={model} size={32} />}
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
