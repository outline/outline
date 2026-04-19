import type { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { PlusIcon, WebhooksIcon } from "outline-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import { ConditionalFade } from "~/components/Fade";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { StickyFilters } from "~/scenes/Settings/components/StickyFilters";
import { createWebhookSubscription } from "./actions";
import { WebhookSubscriptionsTable } from "./components/WebhookSubscriptionsTable";

function Webhooks() {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { webhookSubscriptions } = useStores();
  const can = usePolicy(team);
  const appName = env.APP_NAME;
  const params = useQuery();
  const history = useHistory();
  const location = useLocation();
  const [query, setQuery] = useState(params.get("query") || "");

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
      sort: params.get("sort") || "createdAt",
      direction: (params.get("direction") || "desc").toUpperCase() as
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

  const orderedData = webhookSubscriptions.orderedData;
  const filteredWebhooks = useMemo(
    () =>
      reqParams.query
        ? webhookSubscriptions.findByQuery(reqParams.query)
        : orderedData,
    [webhookSubscriptions, orderedData, reqParams.query]
  );

  const { data, error, loading, next } = useTableRequest({
    data: filteredWebhooks,
    sort,
    reqFn: webhookSubscriptions.fetchPage,
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

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    },
    []
  );

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load webhooks"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  return (
    <Scene
      title={t("Webhooks")}
      icon={<WebhooksIcon />}
      actions={
        <>
          {can.createWebhookSubscription && (
            <Action>
              <Button
                type="button"
                action={createWebhookSubscription}
                icon={<PlusIcon />}
              >
                {`${t("New webhook")}…`}
              </Button>
            </Action>
          )}
        </>
      }
      wide
    >
      <Heading>{t("Webhooks")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Webhooks can be used to notify your application when events happen in{" "}
          {{ appName }}. Events are sent as a https request with a JSON payload
          in near real-time.
        </Trans>
      </Text>
      <StickyFilters>
        <InputSearch
          short
          value={query}
          placeholder={`${t("Filter")}…`}
          onChange={handleSearch}
        />
      </StickyFilters>
      <ConditionalFade animate={!data}>
        <WebhookSubscriptionsTable
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
}

export default observer(Webhooks);
