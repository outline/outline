// @flow
import * as React from "react";
import Share from "models/Share";
import ListItem from "components/List/Item";
import Time from "components/Time";
import ShareMenu from "menus/ShareMenu";

type Props = {
  share: Share,
};

const ShareListItem = ({ share }: Props) => {
  return (
    <ListItem
      key={share.id}
      title={share.documentTitle}
      subtitle={
        <>
          Shared <Time dateTime={share.createdAt} /> ago by{" "}
          {share.createdBy.name}
        </>
      }
      actions={<ShareMenu share={share} />}
    />
  );
};

export default ShareListItem;
