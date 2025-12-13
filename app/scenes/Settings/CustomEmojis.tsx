import { ColumnSort } from "@tanstack/react-table";
import { observer } from "mobx-react";
import { PlusIcon, SmileyIcon } from "outline-icons";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import { ConditionalFade } from "~/components/Fade";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { createEmoji } from "~/actions/definitions/emojis";
import useActionContext from "~/hooks/useActionContext";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import EmojisTable from "./components/EmojisTable";
import { StickyFilters } from "./components/StickyFilters";
import EmojisStore from "~/stores/EmojiStore";

function Emojis() {
  const location = useLocation();
  const history = useHistory();
  const team = useCurrentTeam();
  const context = useActionContext();
  const { emojis } = useStores();
  const { t } = useTranslation();
  const params = useQuery();
  const can = usePolicy(team);
  const [query, setQuery] = useState("");

  const reqParams = useMemo(
    () => ({
      query: params.get("query") || undefined,
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
    data: getFilteredEmojis({
      emojis,
      query: reqParams.query,
    }),
    sort,
    reqFn: emojis.fetchPage,
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

  const handleSearch = useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load emojis"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateParams("query", query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateParams]);

  return (
    <Scene
      title={t("Emojis")}
      icon={<SmileyIcon />}
      actions={
        <>
          {can.createEmoji && (
            <Action>
              <Button
                type="button"
                data-on="click"
                data-event-category="emoji"
                data-event-action="create"
                action={createEmoji}
                context={context}
                icon={<PlusIcon />}
              >
                {t("New emoji")}…
              </Button>
            </Action>
          )}
        </>
      }
      wide
    >
      <Heading>{t("Emojis")}</Heading>
      <Text as="p" type="secondary">
        {t(
          "Custom emojis can be used throughout your workspace in documents, comments, and reactions."
        )}
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
        <EmojisTable
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

function getFilteredEmojis({
  emojis,
  query,
}: {
  emojis: EmojisStore;
  query?: string;
}) {
  let filteredEmojis = emojis.orderedData;

  if (query) {
    filteredEmojis = filteredEmojis.filter((emoji) =>
      emoji.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  return filteredEmojis;
}

export default observer(Emojis);
