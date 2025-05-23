import compact from "lodash/compact";
import sortBy from "lodash/sortBy";
import { observer } from "mobx-react";
import { useMemo, useCallback } from "react";
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
};

function DocumentViews({ document }: Props) {
  const { t } = useTranslation();
  const { views, presence } = useStores();
  const user = useCurrentUser();
  const locale = dateLocale(user.language);
  const documentPresence = presence.get(document.id);
  const documentPresenceArray = documentPresence
    ? Array.from(documentPresence.values())
    : [];

  // Use Set for O(1) lookups and stable references
  const presentIds = useMemo(
    () => new Set(documentPresenceArray.map((p) => p.userId)),
    [documentPresenceArray]
  );
  const editingIds = useMemo(
    () =>
      new Set(
        documentPresenceArray.filter((p) => p.isEditing).map((p) => p.userId)
      ),
    [documentPresenceArray]
  );

  // ensure currently present via websocket are always ordered first
  const documentViews = useMemo(
    () => views.inDocument(document.id),
    [views, document.id]
  );
  const sortedViews = useMemo(
    () => sortBy(documentViews, (view) => !presentIds.has(view.userId)),
    [documentViews, presentIds]
  );
  const users = useMemo(
    () => compact(sortedViews.map((v) => v.user)),
    [sortedViews]
  );

  // Memoize renderItem for PaginatedList
  const renderItem = useCallback(
    (model: User) => {
      const view = documentViews.find((v) => v.userId === model.id);
      const isPresent = presentIds.has(model.id);
      const isEditing = editingIds.has(model.id);
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
            <Avatar key={model.id} model={model} size={AvatarSize.Large} />
          }
          border={false}
          small
        />
      );
    },
    [documentViews, presentIds, editingIds, t, locale]
  );

  return (
    <PaginatedList<User>
      aria-label={t("Viewers")}
      items={users}
      renderItem={renderItem}
    />
  );
}

export default observer(DocumentViews);
