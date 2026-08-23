import { filter, isEqual, orderBy, uniq } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type Note from "~/models/Note";
import { AvatarSize, AvatarWithPresence } from "~/components/Avatar";
import NoteViews from "~/components/NoteViews";
import Facepile from "~/components/Facepile";
import NudeButton from "~/components/NudeButton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { useNotePresence } from "~/stores/presence";
type Props = {
  /** The note to display live collaborators for */
  note: Note;
  /** The maximum number of collaborators to display, defaults to 6 */
  limit?: number;
};
/**
 * Displays a list of live collaborators for a note, including their avatars
 * and presence status.
 */
function Collaborators(props: Props) {
  const { limit = 6 } = props;
  const { t } = useTranslation();
  const user = useCurrentUser();
  const currentUserId = user?.id;
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);
  const { users, ui } = useStores();
  const { note } = props;
  const { observingUserId } = ui;
  const notePresence = useNotePresence(note.id);
  const notePresenceArray = useMemo(
    () => (notePresence ? Array.from(notePresence.values()) : []),
    [notePresence]
  );
  // Use Set for O(1) lookups and stable references. The current user is
  // always included to avoid a flash while the multiplayer connection forms.
  const presentIds = useMemo(() => {
    const ids = new Set(notePresenceArray.map((p) => p.userId));
    if (currentUserId) {
      ids.add(currentUserId);
    }
    return ids;
  }, [notePresenceArray, currentUserId]);
  const editingIds = useMemo(
    () =>
      new Set(
        notePresenceArray.filter((p) => p.isEditing).map((p) => p.userId)
      ),
    [notePresenceArray]
  );
  // ensure currently present via websocket are always ordered first
  // Memoize collaboratorIds as a Set for efficient lookup
  const collaboratorIdsSet = useMemo(
    () => new Set(note.collaboratorIds ?? []),
    [note.collaboratorIds]
  );
  const collaborators = useMemo(
    () =>
      orderBy(
        filter(
          users.all,
          (u) =>
            (presentIds.has(u.id) || collaboratorIdsSet.has(u.id)) &&
            !u.isSuspended
        ),
        [(u) => presentIds.has(u.id), "id"],
        ["asc", "asc"]
      ),
    [collaboratorIdsSet, users.all, presentIds]
  );
  // load any users we don't yet have in memory
  // Memoize ids to avoid unnecessary effect executions
  const missingUserIds = useMemo(
    () =>
      uniq([...collaboratorIdsSet, ...presentIds])
        .filter((userId) => !users.get(userId))
        .sort(),
    [collaboratorIdsSet, presentIds, users]
  );
  useEffect(() => {
    if (
      !isEqual(requestedUserIds, missingUserIds) &&
      missingUserIds.length > 0
    ) {
      setRequestedUserIds(missingUserIds);
      void users.fetchPage({ ids: missingUserIds, limit: 100 });
    }
  }, [missingUserIds, requestedUserIds, users]);
  // Memoize onClick handler to avoid inline function creation
  const handleAvatarClick = useCallback(
    (
      collaboratorId: string,
      isPresent: boolean,
      isObserving: boolean,
      isObservable: boolean
    ) =>
      (ev: React.MouseEvent) => {
        if (isObservable && isPresent) {
          ev.preventDefault();
          ev.stopPropagation();
          ui.setObservingUser(isObserving ? undefined : collaboratorId);
        }
      },
    [ui]
  );
  const renderAvatar = useCallback(
    ({ model: collaborator, ...rest }) => {
      const isPresent = presentIds.has(collaborator.id);
      const isEditing = editingIds.has(collaborator.id);
      const isObserving = observingUserId === collaborator.id;
      const isObservable = collaborator.id !== currentUserId;
      return (
        <AvatarWithPresence
          key={collaborator.id}
          {...rest}
          user={collaborator}
          isPresent={isPresent}
          isEditing={isEditing}
          isObserving={isObserving}
          isCurrentUser={currentUserId === collaborator.id}
          alt={t("Avatar of {{ name }}", { name: collaborator.name })}
          onClick={
            isObservable
              ? handleAvatarClick(
                  collaborator.id,
                  isPresent,
                  isObserving,
                  isObservable
                )
              : undefined
          }
        />
      );
    },
    [
      presentIds,
      editingIds,
      observingUserId,
      currentUserId,
      handleAvatarClick,
      t,
    ]
  );
  if (!note.insightsEnabled) {
    return null;
  }
  return (
    <Popover>
      <PopoverTrigger>
        <NudeButton
          width={Math.min(collaborators.length, limit) * AvatarSize.Large}
          height={AvatarSize.Large}
        >
          <Facepile
            size={AvatarSize.Large}
            limit={limit}
            overflow={Math.max(0, collaborators.length - limit)}
            users={collaborators}
            renderAvatar={renderAvatar}
          />
        </NudeButton>
      </PopoverTrigger>
      <PopoverContent aria-label={t("Viewers")} side="bottom" align="end">
        <NoteViews note={note} />
      </PopoverContent>
    </Popover>
  );
}
export default observer(Collaborators);
