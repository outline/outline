import filter from "lodash/filter";
import isEqual from "lodash/isEqual";
import sortBy from "lodash/sortBy";
import uniq from "lodash/uniq";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import Document from "~/models/Document";
import AvatarWithPresence from "~/components/Avatar/AvatarWithPresence";
import DocumentViews from "~/components/DocumentViews";
import Facepile from "~/components/Facepile";
import NudeButton from "~/components/NudeButton";
import Popover from "~/components/Popover";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type Props = {
  document: Document;
};

function Collaborators(props: Props) {
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
      sortBy(
        filter(
          users.orderedData,
          (user) =>
            (presentIds.includes(user.id) ||
              document.collaboratorIds.includes(user.id)) &&
            !user.isSuspended
        ),
        (user) => presentIds.includes(user.id)
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

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <NudeButton width={collaborators.length * 32} height={32} {...props}>
            <Facepile
              users={collaborators}
              renderAvatar={(collaborator) => {
                const isPresent = presentIds.includes(collaborator.id);
                const isEditing = editingIds.includes(collaborator.id);
                const isObserving = ui.observingUserId === collaborator.id;
                const isObservable = collaborator.id !== user.id;

                return (
                  <AvatarWithPresence
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
              }}
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
