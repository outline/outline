import { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { GlobeIcon, WarningIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link, useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
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

function Shares() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const { shares, auth } = useStores();
  const canShareDocuments = auth.team && auth.team.sharing;
  const can = usePolicy(team);
  const params = useQuery();
  const [query, setQuery] = React.useState("");

  const reqParams = React.useMemo(
    () => ({
      query: params.get("query") || undefined,
      sort: params.get("sort") || "createdAt",
      direction: (params.get("direction") || "desc").toUpperCase() as
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
    data: shares.findByQuery(reqParams.query ?? ""),
    sort,
    reqFn: shares.fetchPage,
    reqParams,
  });

  const updateParams = React.useCallback(
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

  const handleSearch = React.useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  React.useEffect(() => {
    if (error) {
      toast.error(t("Could not load shares"));
    }
  }, [t, error]);

  React.useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  return (
    <Scene title={t("Shared Links")} icon={<GlobeIcon />} wide>
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

      <StickyFilters gap={8}>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
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
