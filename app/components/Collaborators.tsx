import filter from "lodash/filter";
import isEqual from "lodash/isEqual";
import orderBy from "lodash/orderBy";
import uniq from "lodash/uniq";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import Document from "~/models/Document";
import { AvatarSize, AvatarWithPresence } from "~/components/Avatar";
import DocumentViews from "~/components/DocumentViews";
import Facepile from "~/components/Facepile";
import NudeButton from "~/components/NudeButton";
import Popover from "~/components/Popover";
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
  const [requestedUserIds, setRequestedUserIds] = React.useState<string[]>([]);
  const { users, presence, ui } = useStores();
  const { document } = props;
  const documentPresence = presence.get(document.id);
  const documentPresenceArray = documentPresence
    ? Array.from(documentPresence.values())
    : [];

  const presentIds = documentPresenceArray.map((p) => p.userId);
  const editingIds = documentPresenceArray
    .filter((p) => p.isEditing)
    .map((p) => p.userId);

  // ensure currently present via websocket are always ordered first
  const collaborators = React.useMemo(
    () =>
      orderBy(
        filter(
          users.orderedData,
          (u) =>
            (presentIds.includes(u.id) ||
              document.collaboratorIds.includes(u.id)) &&
            !u.isSuspended
        ),
        [(u) => presentIds.includes(u.id), "id"],
        ["asc", "asc"]
      ),
    [document.collaboratorIds, users.orderedData, presentIds]
  );

  // load any users we don't yet have in memory
  React.useEffect(() => {
    const ids = uniq([...document.collaboratorIds, ...presentIds])
      .filter((userId) => !users.get(userId))
      .sort();

    if (!isEqual(requestedUserIds, ids) && ids.length > 0) {
      setRequestedUserIds(ids);
      void users.fetchPage({ ids, limit: 100 });
    }
  }, [document, users, presentIds, document.collaboratorIds, requestedUserIds]);

  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-end",
  });

  const renderAvatar = React.useCallback(
    ({ model: collaborator, ...rest }) => {
      const isPresent = presentIds.includes(collaborator.id);
      const isEditing = editingIds.includes(collaborator.id);
      const isObserving = ui.observingUserId === collaborator.id;
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
              ? (ev) => {
                  if (isPresent) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    ui.setObservingUser(
                      isObserving ? undefined : collaborator.id
                    );
                  }
                }
              : undefined
          }
        />
      );
    },
    [presentIds, ui, currentUserId, editingIds]
  );

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(popoverProps) => (
          <NudeButton
            width={Math.min(collaborators.length, limit) * AvatarSize.Large}
            height={AvatarSize.Large}
            {...popoverProps}
          >
            <Facepile
              size={AvatarSize.Large}
              limit={limit}
              overflow={Math.max(0, collaborators.length - limit)}
              users={collaborators}
              renderAvatar={renderAvatar}
            />
          </NudeButton>
        )}
      </PopoverDisclosure>
      <Popover {...popover} width={300} aria-label={t("Viewers")} tabIndex={0}>
        <DocumentViews document={document} isOpen={popover.visible} />
      </Popover>
    </>
  );
}

export default observer(Collaborators);
