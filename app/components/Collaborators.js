// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { sortBy } from 'lodash';
import styled, { withTheme } from 'styled-components';
import { MAX_AVATAR_DISPLAY } from 'shared/constants';

import Flex from 'shared/components/Flex';
import AvatarWithPresence from 'components/AvatarWithPresence';
import Document from 'models/Document';
import ViewsStore from 'stores/ViewsStore';
import DocumentPresenceStore from 'stores/DocumentPresenceStore';

type Props = {
  views: ViewsStore,
  presence: DocumentPresenceStore,
  document: Document,
  currentUserId: string,
};

@observer
class Collaborators extends React.Component<Props> {
  componentDidMount() {
    this.props.views.fetchPage({ documentId: this.props.document.id });
  }

  render() {
    const { document, presence, views, currentUserId } = this.props;
    const documentViews = views.inDocument(document.id);
    let documentPresence = presence.get(document.id);
    documentPresence = documentPresence
      ? Array.from(documentPresence.values())
      : [];
    const presentIds = documentPresence.map(p => p.userId);
    const editingIds = documentPresence
      .filter(p => p.isEditing)
      .map(p => p.userId);

    // only show the most recent viewers, the rest can overflow
    let mostRecentViewers = documentViews.slice(0, MAX_AVATAR_DISPLAY);

    // ensure currently present via websocket are always ordered first
    mostRecentViewers = sortBy(mostRecentViewers, view =>
      presentIds.includes(view.user.id)
    );

    // if there are too many to display then add a (+X) to the UI
    const overflow = documentViews.length - mostRecentViewers.length;

    return (
      <Avatars>
        {overflow > 0 && <More>+{overflow}</More>}
        {mostRecentViewers.map(({ lastViewedAt, user }) => {
          const isPresent = presentIds.includes(user.id);
          const isEditing = editingIds.includes(user.id);

          return (
            <AvatarWithPresence
              key={user.id}
              user={user}
              lastViewedAt={lastViewedAt}
              isPresent={isPresent}
              isEditing={isEditing}
              isCurrentUser={currentUserId === user.id}
            />
          );
        })}
      </Avatars>
    );
  }
}

const More = styled.div`
  min-width: 30px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.theme.slate};
  color: ${props => props.theme.text};
  border: 2px solid ${props => props.theme.background};
  text-align: center;
  line-height: 20px;
  font-size: 11px;
  font-weight: 600;
`;

const Avatars = styled(Flex)`
  align-items: center;
  flex-direction: row-reverse;
  cursor: pointer;
`;

export default inject('views', 'presence')(withTheme(Collaborators));
