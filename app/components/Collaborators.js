// @flow
import { sortBy, filter, uniq } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Document from "models/Document";
import { AvatarWithPresence } from "components/Avatar";
import DocumentViews from "components/DocumentViews";
import Facepile from "components/Facepile";
import NudeButton from "components/NudeButton";
import Popover from "components/Popover";
import useStores from "hooks/useStores";

type Props = {|
  document: Document,
  currentUserId: string,
|};

function Collaborators(props: Props) {
  const { t } = useTranslation();
  const { users, presence } = useStores();
  const { document, currentUserId } = props;

  let documentPresence = presence.get(document.id);
  documentPresence = documentPresence
    ? Array.from(documentPresence.values())
    : [];

  const presentIds = documentPresence.map((p) => p.userId);
  const editingIds = documentPresence
    .filter((p) => p.isEditing)
    .map((p) => p.userId);

  // ensure currently present via websocket are always ordered first
  const collaborators = React.useMemo(
    () =>
      sortBy(
        filter(
          users.orderedData,
          (user) =>
            presentIds.includes(user.id) ||
            document.collaboratorIds.includes(user.id)
        ),
        (user) => presentIds.includes(user.id)
      ),
    [document.collaboratorIds, users.orderedData, presentIds]
  );

  // load any users we don't know about
  React.useEffect(() => {
    if (users.isFetching) {
      return;
    }

    uniq([...document.collaboratorIds, ...presentIds]).forEach((userId) => {
      if (!users.get(userId)) {
        return users.fetch(userId);
      }
    });
  }, [document, users, presentIds, document.collaboratorIds]);

  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-end",
  });

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <NudeButton width={collaborators.length * 32} height={32} {...props}>
            <FacepileHiddenOnMobile
              users={collaborators}
              renderAvatar={(user) => {
                const isPresent = presentIds.includes(user.id);
                const isEditing = editingIds.includes(user.id);

                return (
                  <AvatarWithPresence
                    key={user.id}
                    user={user}
                    isPresent={isPresent}
                    isEditing={isEditing}
                    isCurrentUser={currentUserId === user.id}
                    profileOnClick={false}
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

const FacepileHiddenOnMobile = styled(Facepile)`
  ${breakpoint("mobile", "tablet")`
    display: none;
  `};
`;

export default observer(Collaborators);
