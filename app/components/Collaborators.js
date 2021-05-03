// @flow
import { sortBy, keyBy } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { MAX_AVATAR_DISPLAY } from "shared/constants";
import Document from "models/Document";
import { AvatarWithPresence } from "components/Avatar";
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
  const { views, presence } = useStores();
  const { document, currentUserId } = props;

  React.useEffect(() => {
    if (!document.isDeleted) {
      views.fetchPage({ documentId: document.id });
    }
  }, [document, views]);

  let documentPresence = presence.get(document.id);
  documentPresence = documentPresence
    ? Array.from(documentPresence.values())
    : [];

  const documentViews = views.inDocument(document.id);

  const presentIds = documentPresence.map((p) => p.userId);
  const editingIds = documentPresence
    .filter((p) => p.isEditing)
    .map((p) => p.userId);

  // ensure currently present via websocket are always ordered first
  const mostRecentViewers = sortBy(
    documentViews.slice(0, MAX_AVATAR_DISPLAY),
    (view) => {
      return presentIds.includes(view.user.id);
    }
  );

  const viewersKeyedByUserId = keyBy(mostRecentViewers, (v) => v.user.id);
  const overflow = documentViews.length - mostRecentViewers.length;

  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-end",
  });

  const users = React.useMemo(() => mostRecentViewers.map((v) => v.user), [
    mostRecentViewers,
  ]);

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <NudeButton width={users.length * 32} height={32} {...props}>
            <FacepileHiddenOnMobile
              users={users}
              overflow={overflow}
              renderAvatar={(user) => {
                const isPresent = presentIds.includes(user.id);
                const isEditing = editingIds.includes(user.id);
                const { lastViewedAt } = viewersKeyedByUserId[user.id];

                return (
                  <AvatarWithPresence
                    key={user.id}
                    user={user}
                    lastViewedAt={lastViewedAt}
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
      <Popover {...popover} width={300} aria-label={t("Collaborators")}>
        <p>test</p>
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
