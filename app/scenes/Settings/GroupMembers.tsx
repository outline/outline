import type { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { GroupIcon, HiddenIcon, PlusIcon } from "outline-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useHistory, useLocation } from "react-router-dom";
import { useTheme } from "styled-components";
import { toast } from "sonner";
import type User from "~/models/User";
import { Action } from "~/components/Actions";
import Breadcrumb from "~/components/Breadcrumb";
import Button from "~/components/Button";
import { ConditionalFade } from "~/components/Fade";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import LoadingIndicator from "~/components/LoadingIndicator";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import Error404 from "~/scenes/Errors/Error404";
import { createInternalLinkAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import type { FetchPageParams, PaginatedResponse } from "~/stores/base/Store";
import { PAGINATION_SYMBOL } from "~/stores/base/Store";
import GroupMenu from "~/menus/GroupMenu";
import { AddPeopleToGroupDialog } from "./components/GroupDialogs";
import { GroupMembersTable } from "./components/GroupMembersTable";
import { StickyFilters } from "./components/StickyFilters";
import { settingsPath } from "~/utils/routeHelpers";

/**
 * Settings page that lists members of a specific group.
 */
function GroupMembers() {
  const { id } = useParams<{ id: string }>();
  const { groups } = useStores();
  const group = groups.get(id);
  const { request, error } = useRequest(() => groups.fetch(id));

  useEffect(() => {
    if (!group) {
      void request();
    }
  }, [group, request]);

  if (error) {
    return <Error404 />;
  }

  if (!group) {
    return <LoadingIndicator />;
  }

  return <GroupMembersPage groupId={group.id} />;
}

const GroupMembersPage = observer(function GroupMembersPage({
  groupId,
}: {
  groupId: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { dialogs, groups, users, groupUsers } = useStores();
  const group = groups.get(groupId)!;
  const can = usePolicy(group);
  const history = useHistory();
  const location = useLocation();
  const params = useQuery();
  const [query, setQuery] = useState("");

  const reqParams = useMemo(
    () => ({
      id: group.id,
      query: params.get("query") || undefined,
      sort: params.get("sort") || "name",
      direction: (params.get("direction") || "asc").toUpperCase() as
        | "ASC"
        | "DESC",
    }),
    [params, group.id]
  );

  const sort: ColumnSort = useMemo(
    () => ({
      id: reqParams.sort,
      desc: reqParams.direction === "DESC",
    }),
    [reqParams.sort, reqParams.direction]
  );

  const fetchMembers = useCallback(
    async (fetchParams: FetchPageParams): Promise<PaginatedResponse<User>> => {
      const response = await groupUsers.fetchPage(fetchParams);
      const result = response.map((gu) => gu.user) as PaginatedResponse<User>;
      result[PAGINATION_SYMBOL] = response[PAGINATION_SYMBOL];
      return result;
    },
    [groupUsers]
  );

  const { data, error, loading, next } = useTableRequest({
    data: users.inGroup(group.id, reqParams.query),
    sort,
    reqFn: fetchMembers,
    reqParams,
  });

  const updateQuery = useCallback(
    (value: string) => {
      if (value) {
        params.set("query", value);
      } else {
        params.delete("query");
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setQuery(value);
    },
    []
  );

  const handleAddPeople = useCallback(() => {
    dialogs.openModal({
      title: t(`Add people to {{groupName}}`, {
        groupName: group.name,
      }),
      content: <AddPeopleToGroupDialog group={group} />,
    });
  }, [t, group, dialogs]);

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load group members"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateQuery]);

  const breadcrumbActions = useMemo(
    () => [
      createInternalLinkAction({
        name: t("Groups"),
        section: NavigationSection,
        icon: <GroupIcon />,
        to: settingsPath("groups"),
      }),
    ],
    [t]
  );

  return (
    <Scene
      title={group.name}
      left={<Breadcrumb actions={breadcrumbActions} />}
      actions={
        <>
          {can.update && (
            <Action>
              <Button
                type="button"
                onClick={handleAddPeople}
                disabled={group.isExternallyManaged}
                icon={<PlusIcon />}
              >
                {`${t("Add people")}…`}
              </Button>
            </Action>
          )}
          <Action>
            <GroupMenu group={group} hideMembers />
          </Action>
        </>
      }
      wide
    >
      <Heading>
        {group.name}
        {group.disableMentions && (
          <>
            &nbsp;
            <Tooltip content={t("This group is hidden")}>
              <HiddenIcon size={32} color={theme.textSecondary} />
            </Tooltip>
          </>
        )}
      </Heading>
      <Text as="p" type="secondary">
        {group.externalGroup && (
          <>
            {t("Synced to {{ provider }}", {
              provider: group.externalGroup.displayName,
            })}
            {group.description && <> &middot; </>}
          </>
        )}
        {group.description || (!group.externalGroup && t("No description"))}
      </Text>
      <StickyFilters>
        <InputSearch
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
      </StickyFilters>
      <ConditionalFade animate={!data}>
        <GroupMembersTable
          group={group}
          data={data ?? []}
          sort={sort}
          loading={loading}
          page={{
            hasNext: !!next,
            fetchNext: next,
          }}
        />
      </ConditionalFade>
    </Scene>
  );
});

export const GroupMembersScene = observer(GroupMembers);
