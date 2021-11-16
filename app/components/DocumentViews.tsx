import { formatDistanceToNow } from "date-fns";
import { sortBy } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Document from "models/Document";
import Avatar from "components/Avatar";
import ListItem from "components/List/Item";
import PaginatedList from "components/PaginatedList";
import useStores from "hooks/useStores";

type Props = {
  document: Document;
  isOpen?: boolean;
};

function DocumentViews({ document, isOpen }: Props) {
  const { t } = useTranslation();
  const { views, presence } = useStores();
  let documentPresence = presence.get(document.id);
  documentPresence = documentPresence
    ? Array.from(documentPresence.values())
    : [];
  // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'p' implicitly has an 'any' type.
  const presentIds = documentPresence.map((p) => p.userId);
  const editingIds = documentPresence
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'p' implicitly has an 'any' type.
    .filter((p) => p.isEditing)
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'p' implicitly has an 'any' type.
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
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ items: any[]; renderItem: (item: any) => E... Remove this comment to see the full error message
          items={users}
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'item' implicitly has an 'any' type.
          renderItem={(item) => {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'v' implicitly has an 'any' type.
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
                // @ts-expect-error ts-migrate(2322) FIXME: Type '{ key: any; title: any; subtitle: string; im... Remove this comment to see the full error message
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
