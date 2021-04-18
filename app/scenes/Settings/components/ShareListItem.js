// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import Share from "models/Share";
import ListItem from "components/List/Item";
import Time from "components/Time";
import ShareMenu from "menus/ShareMenu";

type Props = {|
  share: Share,
|};

const ShareListItem = ({ share }: Props) => {
  const { t } = useTranslation();
  const { lastAccessedAt } = share;

  return (
    <ListItem
      title={share.documentTitle}
      subtitle={
        <>
          {t("Shared")} <Time dateTime={share.createdAt} addSuffix />{" "}
          {t("by {{ name }}", { name: share.createdBy.name })}{" "}
          {lastAccessedAt && (
            <>
              {" "}
              &middot; {t("Last accessed")}{" "}
              <Time dateTime={lastAccessedAt} addSuffix />
            </>
          )}
        </>
      }
      actions={<ShareMenu share={share} />}
    />
  );
};

export default ShareListItem;
