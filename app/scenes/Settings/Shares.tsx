import type { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { GlobeIcon, PlusIcon, WarningIcon } from "outline-icons";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link, useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { ShareStatus, ShareTypes } from "@shared/types";
import { ConditionalFade } from "~/components/Fade";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { SharesTable } from "./components/SharesTable";
import { StickyFilters } from "./components/StickyFilters";
import Button from "~/components/Button";
import { Action } from "~/components/Actions";
import useActionContext from "~/hooks/useActionContext";
import { createShareLink } from "~/actions/definitions/createShareLink";
import ShareTypeFilter from "./components/ShareTypeFilter";
import ShareStatusFilter from "./components/ShareStatusFilter";

function Shares() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const { shares, auth } = useStores();
  const canShareDocuments = auth.team && auth.team.sharing;
  const can = usePolicy(team);
  const params = useQuery();
  const [query, setQuery] = useState("");
  const context = useActionContext();
  const typeFilter = useMemo(
    () =>
      params.getAll("type")?.length
        ? (params.getAll("type") as ShareTypes[])
        : [ShareTypes.Web, ShareTypes.Private],
    [params]
  );
  const statusFilter = useMemo(
    () =>
      params.getAll("status")?.length
        ? (params.getAll("status") as ShareStatus[])
        : [ShareStatus.Active, ShareStatus.Inactive],
    [params]
  );

  const published = useMemo(() => {
    const hasActive = statusFilter.includes(ShareStatus.Active);
    const hasInactive = statusFilter.includes(ShareStatus.Inactive);

    if (hasActive && !hasInactive) {
      return true;
    }

    if (!hasActive && hasInactive) {
      return false;
    }

    return undefined;
  }, [statusFilter]);

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      sort: params.get("sort") || "createdAt",
      type: typeFilter.length ? typeFilter : undefined,
      status: statusFilter.length ? statusFilter : undefined,
      published,
      direction: (params.get("direction") || "desc").toUpperCase() as
        | "ASC"
        | "DESC",
    }),
    [params, published, statusFilter, typeFilter]
  );

  const sort: ColumnSort = useMemo(
    () => ({
      id: reqParams.sort,
      desc: reqParams.direction === "DESC",
    }),
    [reqParams.sort, reqParams.direction]
  );

  const filteredData = shares
    .findByQuery(reqParams.query ?? "")
    .filter((share) => {
      const matchesType =
        typeFilter.length === 0 || typeFilter.includes(share.type);

      const matchesStatus =
        statusFilter.length === 0 ||
        (statusFilter.includes(ShareStatus.Active) && share.published) ||
        (statusFilter.includes(ShareStatus.Inactive) && !share.published);

      return matchesType && matchesStatus;
    });

  const { data, error, loading, next } = useTableRequest({
    data: filteredData,
    sort,
    reqFn: shares.fetchPage,
    reqParams,
  });

  const updateParams = useCallback(
    (name: string, value: string | string[]) => {
      if (typeof value === "string") {
        if (value) {
          params.set(name, value);
        } else {
          params.delete(name);
        }
      } else {
        params.delete(name);
        for (const v of value) {
          params.append(name, v);
        }
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleSearch = useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load shares"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  const handleStatusFilter = useCallback(
    ({ statusFilter }) => {
      updateParams("status", statusFilter);
    },
    [updateParams]
  );

  const handleTypeFilter = useCallback(
    ({ typeFilter }) => updateParams("type", typeFilter),
    [updateParams]
  );

  return (
    <Scene
      title={t("Shared Links")}
      icon={<GlobeIcon />}
      wide
      actions={
        <>
          {canShareDocuments && (
            <Action>
              <Button
                type="button"
                data-on="click"
                data-event-category="share-link"
                data-event-action="create"
                action={createShareLink}
                context={context}
                icon={<PlusIcon />}
              >
                {t("New Link")}...
              </Button>
            </Action>
          )}
        </>
      }
    >
      <Heading>{t("Shared Links")}</Heading>

      {can.update && !canShareDocuments && (
        <>
          <Notice icon={<WarningIcon />}>
            {t("Sharing is currently disabled.")}{" "}
            <Trans
              defaults="You can globally enable and disable public document sharing in the <em>security settings</em>."
              components={{
                em: <Link to="/settings/security" />,
              }}
            />
          </Notice>
          <br />
        </>
      )}

      <Text as="p" type="secondary">
        <Trans>
          Documents that have been shared are listed below. Anyone that has the
          public link can access a read-only version of the document until the
          link has been revoked.
        </Trans>
      </Text>

      <StickyFilters gap={50}>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
        <ShareTypeFilter typeFilter={typeFilter} onSelect={handleTypeFilter} />
        <ShareStatusFilter
          statusFilter={statusFilter}
          onSelect={handleStatusFilter}
        />
      </StickyFilters>
      <ConditionalFade animate={!data}>
        <SharesTable
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

export default observer(Shares);
