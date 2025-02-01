import { isEmail } from "class-validator";
import concat from "lodash/concat";
import { observer } from "mobx-react";
import { CheckmarkIcon, CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import { stringToColor } from "@shared/utils/color";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Group from "~/models/Group";
import User from "~/models/User";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import { Avatar, GroupAvatar, AvatarSize, IAvatar } from "~/components/Avatar";
import Empty from "~/components/Empty";
import Placeholder from "~/components/List/Placeholder";
import Scrollable from "~/components/Scrollable";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMaxHeight from "~/hooks/useMaxHeight";
import useStores from "~/hooks/useStores";
import useThrottledCallback from "~/hooks/useThrottledCallback";
import { InviteIcon, ListItem } from "./ListItem";

type Suggestion = IAvatar & {
  id: string;
};

type Props = {
  /** The document being shared. */
  document?: Document;
  /** The collection being shared. */
  collection?: Collection;
  /** The search query to filter users by. */
  query: string;
  /** A list of pending user ids that have not yet been invited. */
  pendingIds: string[];
  /** Callback to add a user to the pending list. */
  addPendingId: (id: string) => void;
  /** Callback to remove a user from the pending list. */
  removePendingId: (id: string) => void;
  /** Handles escape from suggestions list */
  onEscape?: (ev: React.KeyboardEvent<HTMLDivElement>) => void;
};

export const Suggestions = observer(
  React.forwardRef(function _Suggestions(
    {
      document,
      collection,
      query,
      pendingIds,
      addPendingId,
      removePendingId,
      onEscape,
    }: Props,
    ref: React.Ref<HTMLDivElement>
  ) {
    const neverRenderedList = React.useRef(false);
    const { users, groups } = useStores();
    const { t } = useTranslation();
    const user = useCurrentUser();
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const { maxHeight } = useMaxHeight({
      elementRef: containerRef,
      maxViewportPercentage: 70,
    });

    const fetchUsersByQuery = useThrottledCallback(
      (query: string) => {
        void users.fetchPage({ query });
        void groups.fetchPage({ query });
      },
      250,
      undefined,
      {
        leading: true,
      }
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
      const filtered: Suggestion[] = (
        document
          ? users.notInDocument(document.id, query)
          : collection
          ? users.notInCollection(collection.id, query)
          : users.orderedData
      ).filter((u) => !u.isSuspended && u.id !== user.id);

      if (isEmail(query)) {
        filtered.push(getSuggestionForEmail(query));
      }

      return [
        ...(document
          ? groups.notInDocument(document.id, query)
          : collection
          ? groups.notInCollection(collection.id, query)
          : []),
        ...filtered,
      ];
    }, [
      getSuggestionForEmail,
      users,
      users.orderedData,
      groups,
      groups.orderedData,
      document?.id,
      document?.members,
      collection?.id,
      user.id,
      query,
      t,
    ]);

    const pending = React.useMemo(
      () =>
        pendingIds
          .map((id) =>
            isEmail(id)
              ? getSuggestionForEmail(id)
              : users.get(id) ?? groups.get(id)
          )
          .filter(Boolean) as User[],
      [users, groups, getSuggestionForEmail, pendingIds]
    );

    React.useEffect(() => {
      void fetchUsersByQuery(query);
    }, [query, fetchUsersByQuery]);

    function getListItemProps(suggestion: User | Group) {
      if (suggestion instanceof Group) {
        return {
          title: suggestion.name,
          subtitle: t("{{ count }} member", {
            count: suggestion.memberCount,
          }),
          image: <GroupAvatar group={suggestion} />,
        };
      }
      return {
        title: suggestion.name,
        subtitle: suggestion.email
          ? suggestion.email
          : suggestion.isViewer
          ? t("Viewer")
          : t("Editor"),
        image: <Avatar model={suggestion} size={AvatarSize.Medium} />,
      };
    }

    const isEmpty = suggestions.length === 0;
    const suggestionsWithPending = suggestions.filter(
      (u) => !pendingIds.includes(u.id)
    );

    if (users.isFetching && isEmpty && neverRenderedList.current) {
      return <Placeholder />;
    }

    neverRenderedList.current = false;

    return (
      <ScrollableContainer
        ref={containerRef}
        hiddenScrollbars
        style={{ maxHeight }}
      >
        <ArrowKeyNavigation
          ref={ref}
          onEscape={onEscape}
          aria-label={t("Suggestions for invitation")}
          items={concat(pending, suggestionsWithPending)}
        >
          {() => [
            ...pending.map((suggestion) => (
              <PendingListItem
                keyboardNavigation
                {...getListItemProps(suggestion)}
                key={suggestion.id}
                onClick={() => removePendingId(suggestion.id)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    ev.stopPropagation();
                    removePendingId(suggestion.id);
                  }
                }}
                actions={
                  <>
                    <InvitedIcon />
                    <RemoveIcon />
                  </>
                }
              />
            )),
            pending.length > 0 &&
              (suggestionsWithPending.length > 0 || isEmpty) && <Separator />,
            ...suggestionsWithPending.map((suggestion) => (
              <ListItem
                keyboardNavigation
                {...getListItemProps(suggestion as User)}
                key={suggestion.id}
                onClick={() => addPendingId(suggestion.id)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter") {
                    ev.preventDefault();
                    ev.stopPropagation();
                    addPendingId(suggestion.id);
                  }
                }}
                actions={<InviteIcon />}
              />
            )),
            isEmpty && (
              <Empty style={{ marginTop: 22 }}>{t("No matches")}</Empty>
            ),
          ]}
        </ArrowKeyNavigation>
      </ScrollableContainer>
    );
  })
);

const InvitedIcon = styled(CheckmarkIcon)`
  color: ${s("accent")};
`;

const RemoveIcon = styled(CloseIcon)`
  display: none;
`;

const PendingListItem = styled(ListItem)`
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

const ScrollableContainer = styled(Scrollable)`
  padding: 12px 24px;
  margin: -12px -24px;
`;
