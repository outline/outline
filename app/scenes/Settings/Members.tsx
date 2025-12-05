import { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { DownloadIcon, PlusIcon, UserIcon } from "outline-icons";
import { useState, useMemo, useCallback, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import UsersStore, { queriedUsers } from "~/stores/UsersStore";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import { ConditionalFade } from "~/components/Fade";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { inviteUser } from "~/actions/definitions/users";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { convertToCSV } from "~/utils/csv";
import download from "~/utils/download";
import { MembersTable } from "./components/MembersTable";
import { StickyFilters } from "./components/StickyFilters";
import UserRoleFilter from "./components/UserRoleFilter";
import UserStatusFilter from "./components/UserStatusFilter";

function Members() {
  const appName = env.APP_NAME;
  const location = useLocation();
  const history = useHistory();
  const team = useCurrentTeam();
  const { users } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const can = usePolicy(team);
  const [query, setQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      filter: params.get("filter") || "active",
      role: params.get("role") || undefined,
      sort: params.get("sort") || "name",
      direction: (params.get("direction") || "asc").toUpperCase() as
        | "ASC"
        | "DESC",
    }),
    [params]
  );

  const sort: ColumnSort = useMemo(
    () => ({
      id: reqParams.sort,
      desc: reqParams.direction === "DESC",
    }),
    [reqParams.sort, reqParams.direction]
  );

  const { data, error, loading, next } = useTableRequest({
    data: getFilteredUsers({
      users,
      query: reqParams.query,
      filter: reqParams.filter,
      role: reqParams.role,
    }),
    sort,
    reqFn: users.fetchPage,
    reqParams,
  });

  const updateParams = useCallback(
    (name: string, value: string) => {
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleStatusFilter = useCallback(
    (status) => updateParams("filter", status),
    [updateParams]
  );

  const handleRoleFilter = useCallback(
    (role) => updateParams("role", role),
    [updateParams]
  );

  const handleSearch = useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const allUsers = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;
      const maxPages = 1000; // Safety limit to prevent infinite loops
      let pagesProcessed = 0;

      // Fetch all users with pagination
      while (hasMore && pagesProcessed < maxPages) {
        try {
          const response = await users.fetchPage({
            ...reqParams,
            offset,
            limit,
          });

          if (response.length === 0) {
            hasMore = false;
            break;
          }

          allUsers.push(...response);

          // Check if there are more pages
          if (response.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }

          pagesProcessed++;
        } catch (err) {
          console.error(`Error fetching page at offset ${offset}:`, err);
          throw new Error(`Failed to fetch users at page ${pagesProcessed + 1}`);
        }
      }

      // Convert to CSV format with formatted dates
      const csvData = allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email || "",
        lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : "",
        lastActiveIp: user.lastActiveIp || "",
        createdAt: new Date(user.createdAt).toISOString(),
      }));

      const headers = [
        "id",
        "name",
        "email",
        "lastActiveAt",
        "lastActiveIp",
        "createdAt",
      ] as const;
      const csv = convertToCSV(csvData, headers);

      // Trigger download
      download(csv, "members.csv", "text/csv");
      toast.success(t("Members exported successfully"));
    } catch (err) {
      toast.error(t("Failed to export members"));
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  }, [users, reqParams, t]);

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load members"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  return (
    <Scene
      title={t("Members")}
      icon={<UserIcon />}
      actions={
        <>
          {can.inviteUser && (
            <Action>
              <Button
                type="button"
                data-on="click"
                data-event-category="invite"
                data-event-action="peoplePage"
                action={inviteUser}
                icon={<PlusIcon />}
              >
                {t("Invite people")}…
              </Button>
            </Action>
          )}
        </>
      }
      wide
    >
      <Heading>{t("Members")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Everyone that has signed into {{ appName }} is listed here. It’s
          possible that there are other users who have access through{" "}
          {{ signinMethods: team.signinMethods }} but haven’t signed in yet.
        </Trans>
      </Text>
      <StickyFilters gap={8} justify="space-between">
        <Flex gap={8}>
          <InputSearch
            short
            value={query}
            placeholder={`${t("Filter")}…`}
            onChange={handleSearch}
          />
          <LargeUserStatusFilter
            activeKey={reqParams.filter ?? ""}
            onSelect={handleStatusFilter}
          />
          <LargeUserRoleFilter
            activeKey={reqParams.role ?? ""}
            onSelect={handleRoleFilter}
          />
        </Flex>
        <Button
          type="button"
          icon={<DownloadIcon />}
          onClick={handleExportCSV}
          disabled={isExporting}
          neutral
        >
          {isExporting ? t("Exporting") + "…" : t("Export CSV")}
        </Button>
      </StickyFilters>
      <ConditionalFade animate={!data}>
        <MembersTable
          data={data ?? []}
          sort={sort}
          canManage={can.update}
          loading={loading}
          page={{
            hasNext: !!next,
            fetchNext: next,
          }}
        />
      </ConditionalFade>
    </Scene>
  );
}

function getFilteredUsers({
  users,
  query,
  filter,
  role,
}: {
  users: UsersStore;
  query?: string;
  filter?: string;
  role?: string;
}) {
  let filteredUsers;

  switch (filter) {
    case "all":
      filteredUsers = users.all;
      break;
    case "suspended":
      filteredUsers = users.suspended;
      break;
    case "invited":
      filteredUsers = users.invited;
      break;
    default:
      filteredUsers = users.active;
  }

  if (role) {
    filteredUsers = filteredUsers.filter((user) => user.role === role);
  }

  if (query) {
    filteredUsers = queriedUsers(filteredUsers, query);
  }

  return filteredUsers;
}

const LargeUserStatusFilter = styled(UserStatusFilter)`
  height: 32px;
`;

const LargeUserRoleFilter = styled(UserRoleFilter)`
  height: 32px;
`;

export default observer(Members);
