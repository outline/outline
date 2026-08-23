import { compact, sortBy } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { dateLocale, dateToRelative } from "@shared/utils/date";
import type Note from "~/models/Note";
import type User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import ListItem from "~/components/List/Item";
import PaginatedList from "~/components/PaginatedList";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { useNotePresence } from "~/stores/presence";
type Props = {
  note: Note;
};
function NoteViews({ note }: Props) {
  const { t } = useTranslation();
  const { views } = useStores();
  const notePresence = useNotePresence(note.id);
  const user = useCurrentUser();
  const locale = dateLocale(user.language);
  // Use Set for O(1) lookups; the identity is only replaced when the
  // presence for the note actually changes.
  const presentIds = useMemo(
    () =>
      new Set(
        notePresence
          ? Array.from(notePresence.values()).map((p) => p.userId)
          : []
      ),
    [notePresence]
  );
  const editingIds = useMemo(
    () =>
      new Set(
        notePresence
          ? Array.from(notePresence.values())
              .filter((p) => p.isEditing)
              .map((p) => p.userId)
          : []
      ),
    [notePresence]
  );
  // ensure currently present via websocket are always ordered first
  const noteViews = useMemo(() => views.inNote(note.id), [views, note.id]);
  const sortedViews = useMemo(
    () => sortBy(noteViews, (view) => !presentIds.has(view.userId)),
    [noteViews, presentIds]
  );
  const users = useMemo(
    () => compact(sortedViews.map((v) => v.user)),
    [sortedViews]
  );
  // Memoize renderItem for PaginatedList
  const renderItem = useCallback(
    (model: User) => {
      const view = noteViews.find((v) => v.userId === model.id);
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
    [noteViews, presentIds, editingIds, t, locale]
  );
  return (
    <PaginatedList<User>
      aria-label={t("Viewers")}
      items={users}
      renderItem={renderItem}
    />
  );
}
export default observer(NoteViews);
