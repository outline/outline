import { isEmail } from "class-validator";
import { observer } from "mobx-react";
import { CheckmarkIcon, CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { stringToColor } from "@shared/utils/color";
import Document from "~/models/Document";
import User from "~/models/User";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import useThrottledCallback from "~/hooks/useThrottledCallback";
import { hover } from "~/styles";
import Avatar from "../Avatar";
import { AvatarSize, IAvatar } from "../Avatar/Avatar";
import Empty from "../Empty";
import { InviteIcon, StyledListItem } from "./MemberListItem";

type Suggestion = IAvatar & {
  id: string;
};

type Props = {
  /** The document being shared. */
  document: Document;
  /** The search query to filter users by. */
  query: string;
  /** A list of pending user ids that have not yet been invited. */
  pendingIds: string[];
  /** Callback to add a user to the pending list. */
  addPendingId: (id: string) => void;
  /** Callback to remove a user from the pending list. */
  removePendingId: (id: string) => void;
};

export const UserSuggestions = observer(
  ({ document, query, pendingIds, addPendingId, removePendingId }: Props) => {
    const { users } = useStores();
    const { t } = useTranslation();
    const user = useCurrentUser();

    const fetchUsersByQuery = useThrottledCallback(
      (params) => users.fetchPage({ query: params.query }),
      250
    );

    const getSuggestionForEmail = React.useCallback(
      (email: string) => ({
        id: email,
        name: email,
        avatarUrl: "",
        color: stringToColor(email),
        initial: email[0].toUpperCase(),
        email: t("Invite to workspace"),
      }),
      [t]
    );

    const suggestions = React.useMemo(() => {
      const filtered: Suggestion[] = users
        .notInDocument(document.id, query)
        .filter((u) => u.id !== user.id && !u.isSuspended);

      if (isEmail(query)) {
        filtered.push(getSuggestionForEmail(query));
      }

      return filtered;
    }, [
      getSuggestionForEmail,
      users,
      users.orderedData,
      document.id,
      document.members,
      user.id,
      query,
      t,
    ]);

    const pending = React.useMemo(
      () =>
        pendingIds
          .map((id) =>
            isEmail(id) ? getSuggestionForEmail(id) : users.get(id)
          )
          .filter(Boolean) as User[],
      [users, getSuggestionForEmail, pendingIds]
    );

    React.useEffect(() => {
      if (query) {
        void fetchUsersByQuery(query);
      }
    }, [query, fetchUsersByQuery]);

    function getListItemProps(suggestion: User) {
      return {
        title: suggestion.name,
        subtitle: suggestion.email
          ? suggestion.email
          : suggestion.isViewer
          ? t("Viewer")
          : t("Editor"),
        image: (
          <Avatar
            model={suggestion}
            size={AvatarSize.Medium}
            showBorder={false}
          />
        ),
      };
    }

    const isEmpty = suggestions.length === 0;
    const suggestionsWithPending = suggestions.filter(
      (u) => !pendingIds.includes(u.id)
    );

    return (
      <>
        {pending.map((suggestion) => (
          <PendingListItem
            {...getListItemProps(suggestion)}
            key={suggestion.id}
            onClick={() => removePendingId(suggestion.id)}
            actions={
              <>
                <InvitedIcon />
                <RemoveIcon />
              </>
            }
          />
        ))}
        {pending.length > 0 &&
          (suggestionsWithPending.length > 0 || isEmpty) && <Separator />}
        {suggestionsWithPending.map((suggestion) => (
          <StyledListItem
            {...getListItemProps(suggestion as User)}
            key={suggestion.id}
            onClick={() => addPendingId(suggestion.id)}
            actions={<InviteIcon />}
          />
        ))}
        {isEmpty && <Empty style={{ marginTop: 22 }}>{t("No matches")}</Empty>}
      </>
    );
  }
);

const InvitedIcon = styled(CheckmarkIcon)`
  color: ${s("accent")};
`;

const RemoveIcon = styled(CloseIcon)`
  display: none;
`;

const PendingListItem = styled(StyledListItem)`
  &: ${hover} {
    ${InvitedIcon} {
      display: none;
    }

    ${RemoveIcon} {
      display: block;
    }
  }
`;

const Separator = styled.div`
  border-top: 1px dashed ${s("divider")};
  margin: 12px 0;
`;
