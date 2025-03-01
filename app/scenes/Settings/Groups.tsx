import { ColumnSort } from "@tanstack/react-table";
import deburr from "lodash/deburr";
import { observer } from "mobx-react";
import { PlusIcon, GroupIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import Group from "~/models/Group";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import { ConditionalFade } from "~/components/Fade";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { CreateGroupDialog } from "./components/GroupDialogs";
import { GroupsTable } from "./components/GroupsTable";
import { StickyFilters } from "./components/StickyFilters";

function getFilteredGroups(groups: Group[], query?: string) {
  if (!query?.length) {
    return groups;
  }

  const normalizedQuery = deburr(query.toLocaleLowerCase());
  return groups.filter((group) =>
    deburr(group.name).toLocaleLowerCase().includes(normalizedQuery)
  );
}

function Groups() {
  const { t } = useTranslation();
  const { dialogs, groups } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const history = useHistory();
  const location = useLocation();
  const params = useQuery();
  const [query, setQuery] = React.useState("");

  const reqParams = React.useMemo(
    () => ({
      query: params.get("query") || undefined,
      sort: params.get("sort") || "name",
      direction: (params.get("direction") || "asc").toUpperCase() as
        | "ASC"
        | "DESC",
    }),
    [params]
  );

  const sort: ColumnSort = React.useMemo(
    () => ({
      id: reqParams.sort,
      desc: reqParams.direction === "DESC",
    }),
    [reqParams.sort, reqParams.direction]
  );

  const { data, error, loading, next } = useTableRequest({
    data: getFilteredGroups(groups.orderedData, reqParams.query),
    sort,
    reqFn: groups.fetchPage,
    reqParams,
  });

  const isEmpty = !loading && !groups.orderedData.length;

  const updateQuery = React.useCallback(
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

  const handleSearch = React.useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  const handleNewGroup = React.useCallback(() => {
    dialogs.openModal({
      title: t("Create a group"),
      content: <CreateGroupDialog />,
    });
  }, [t, dialogs]);

  React.useEffect(() => {
    if (error) {
      toast.error(t("Could not load groups"));
    }
  }, [t, error]);

  React.useEffect(() => {
    const timeout = setTimeout(() => updateQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateQuery]);

  return (
    <Scene
      title={t("Groups")}
      icon={<GroupIcon />}
      actions={
        <>
          {can.createGroup && (
            <Action>
              <Button
                type="button"
                onClick={handleNewGroup}
                icon={<PlusIcon />}
              >
                {`${t("New group")}…`}
              </Button>
            </Action>
          )}
        </>
      }
      wide
    >
      <Heading>{t("Groups")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Groups can be used to organize and manage the people on your team.
        </Trans>
      </Text>
      {isEmpty ? (
        <Empty>{t("No groups have been created yet")}</Empty>
      ) : (
        <>
          <StickyFilters>
            <InputSearch
              value={query}
              placeholder={`${t("Filter")}…`}
              onChange={handleSearch}
            />
          </StickyFilters>
          <ConditionalFade animate={!data}>
            <GroupsTable
              data={data ?? []}
              sort={sort}
              loading={loading}
              page={{
                hasNext: !!next,
                fetchNext: next,
              }}
            />
          </ConditionalFade>
        </>
      )}
    </Scene>
  );
}

export default observer(Groups);
