import filter from "lodash/filter";
import isEqual from "lodash/isEqual";
import orderBy from "lodash/orderBy";
import uniq from "lodash/uniq";
import { observer } from "mobx-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import { AvatarSize, AvatarWithPresence } from "~/components/Avatar";
import DocumentViews from "~/components/DocumentViews";
import Facepile from "~/components/Facepile";
import NudeButton from "~/components/NudeButton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type Props = {
  /** The document to display live collaborators for */
  document: Document;
  /** The maximum number of collaborators to display, defaults to 6 */
  limit?: number;
};

/**
 * Displays a list of live collaborators for a document, including their avatars
 * and presence status.
 */
function Collaborators(props: Props) {
  const { limit = 6 } = props;
  const { t } = useTranslation();
  const user = useCurrentUser();
  const currentUserId = user?.id;
  const [requestedUserIds, setRequestedUserIds] = useState<string[]>([]);
  const { users, presence, ui } = useStores();
  const { document } = props;
  const { observingUserId } = ui;
  const documentPresence = presence.get(document.id);
  const documentPresenceArray = useMemo(
    () => (documentPresence ? Array.from(documentPresence.values()) : []),
    [documentPresence]
  );

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
  // Memoize collaboratorIds as a Set for efficient lookup
  const collaboratorIdsSet = useMemo(
    () => new Set(document.collaboratorIds),
    [document.collaboratorIds]
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
      uniq([...document.collaboratorIds, ...Array.from(presentIds)])
        .filter((userId) => !users.get(userId))
        .sort(),
    [document.collaboratorIds, presentIds, users]
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
          {...rest}
          key={collaborator.id}
          user={collaborator}
          isPresent={isPresent}
          isEditing={isEditing}
          isObserving={isObserving}
          isCurrentUser={currentUserId === collaborator.id}
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
    [presentIds, editingIds, observingUserId, currentUserId, handleAvatarClick]
  );

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
        <DocumentViews document={document} />
      </PopoverContent>
    </Popover>
  );
}

export default observer(Collaborators);
