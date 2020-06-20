// @flow
import * as React from "react";
import { observer, inject } from "mobx-react";
import { sortBy, keyBy } from "lodash";
import { MAX_AVATAR_DISPLAY } from "shared/constants";

import { AvatarWithPresence } from "components/Avatar";
import Facepile from "components/Facepile";
import Document from "models/Document";
import ViewsStore from "stores/ViewsStore";
import DocumentPresenceStore from "stores/DocumentPresenceStore";

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
    let documentPresence = presence.get(document.id);
    documentPresence = documentPresence
      ? Array.from(documentPresence.values())
      : [];

    const documentViews = views.inDocument(document.id);

    const presentIds = documentPresence.map(p => p.userId);
    const editingIds = documentPresence
      .filter(p => p.isEditing)
      .map(p => p.userId);

    // ensure currently present via websocket are always ordered first
    const mostRecentViewers = sortBy(
      documentViews.slice(0, MAX_AVATAR_DISPLAY),
      view => {
        return presentIds.includes(view.user.id);
      }
    );

    const viewersKeyedByUserId = keyBy(mostRecentViewers, v => v.user.id);
    const overflow = documentViews.length - mostRecentViewers.length;

    return (
      <Facepile
        users={mostRecentViewers.map(v => v.user)}
        overflow={overflow}
        renderAvatar={user => {
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
            />
          );
        }}
      />
    );
  }
}

export default inject("views", "presence")(Collaborators);
