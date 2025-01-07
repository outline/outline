import { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { PlusIcon, GroupIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import GroupNew from "~/scenes/GroupNew";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import { HEADER_HEIGHT } from "~/components/Header";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Modal from "~/components/Modal";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { GroupsTable } from "./components/GroupsTable";

function Groups() {
  const { t } = useTranslation();
  const { groups } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const history = useHistory();
  const location = useLocation();
  const params = useQuery();
  const [query, setQuery] = React.useState("");
  const [newGroupModalOpen, handleNewGroupModalOpen, handleNewGroupModalClose] =
    useBoolean();

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
    data: groups.orderedData,
    reqFn: groups.fetchPage,
    reqParams,
  });

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
                onClick={handleNewGroupModalOpen}
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
      <StickyFilter>
        <InputSearch
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
      </StickyFilter>
      <Fade>
        <GroupsTable
          data={data ?? []}
          sort={sort}
          loading={loading}
          page={{
            hasNext: !!next,
            fetchNext: next,
          }}
        />
      </Fade>

      <Modal
        title={t("Create a group")}
        onRequestClose={handleNewGroupModalClose}
        isOpen={newGroupModalOpen}
      >
        <GroupNew onSubmit={handleNewGroupModalClose} />
      </Modal>
    </Scene>
  );
}

const StickyFilter = styled(Flex)`
  height: 40px;
  position: sticky;
  top: ${HEADER_HEIGHT}px;
  z-index: ${depths.header};
  background: ${s("background")};
`;

export default observer(Groups);
