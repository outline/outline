import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import User from "~/models/User";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import useThrottledCallback from "~/hooks/useThrottledCallback";
import Avatar from "../Avatar";
import { AvatarSize } from "../Avatar/Avatar";
import Empty from "../Empty";
import { InviteIcon, StyledListItem } from "./MemberListItem";

export const UserSuggestions = observer(
  ({
    document,
    query,
    onInvite,
  }: {
    document: Document;
    query: string;
    onInvite: (user: User) => Promise<void>;
  }) => {
    const { users } = useStores();
    const { t } = useTranslation();
    const user = useCurrentUser();

    const fetchUsersByQuery = useThrottledCallback(
      (query) => users.fetchPage({ query }),
      250
    );

    const suggestions = React.useMemo(
      () =>
        users
          .notInDocument(document.id, query)
          .filter((u) => u.id !== user.id && !u.isSuspended),
      [users, users.orderedData, document.id, document.members, user.id, query]
    );

    React.useEffect(() => {
      if (query) {
        void fetchUsersByQuery(query);
      }
    }, [query, fetchUsersByQuery]);

    return suggestions.length ? (
      <>
        {suggestions.map((suggestion) => (
          <StyledListItem
            key={suggestion.id}
            onClick={() => onInvite(suggestion)}
            title={suggestion.name}
            subtitle={suggestion.isViewer ? t("Viewer") : t("Editor")}
            image={
              <Avatar
                model={suggestion}
                size={AvatarSize.Medium}
                showBorder={false}
              />
            }
            actions={<InviteIcon />}
          />
        ))}
      </>
    ) : (
      <Empty style={{ marginTop: 22 }}>{t("No matches")}</Empty>
    );
  }
);
