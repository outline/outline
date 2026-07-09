import type { ColumnSort } from "@tanstack/react-table";
import { deburr } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import type Template from "~/models/Template";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import { ConditionalFade } from "~/components/Fade";
import Heading from "~/components/Heading";
import InputSearch from "~/components/InputSearch";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import NewTemplateMenu from "~/menus/NewTemplateMenu";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { useTableRequest } from "~/hooks/useTableRequest";
import { StickyFilters } from "./components/StickyFilters";
import { TemplatesTable } from "./components/TemplatesTable";

function getFilteredTemplates(templates: Template[], query?: string) {
  if (!query?.length) {
    return templates;
  }

  const normalizedQuery = deburr(query.toLocaleLowerCase());
  return templates.filter((template) =>
    deburr(template.title).toLocaleLowerCase().includes(normalizedQuery)
  );
}

function Templates() {
  const { t } = useTranslation();
  const { templates } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const history = useHistory();
  const location = useLocation();
  const params = useQuery();
  const [query, setQuery] = useState("");

  const searchQuery = params.get("query") || undefined;

  const reqParams = useMemo(
    () => ({
      query: searchQuery,
      sort: params.get("sort") || "createdAt",
      direction: (params.get("direction") || "desc").toUpperCase() as
        | "ASC"
        | "DESC",
      // when browsing we show a tree of root templates that can be expanded,
      // when searching we match against all templates regardless of nesting.
      parentDocumentId: searchQuery ? undefined : null,
    }),
    [params, searchQuery]
  );

  const sort: ColumnSort = useMemo(
    () => ({
      id: reqParams.sort,
      desc: reqParams.direction === "DESC",
    }),
    [reqParams.sort, reqParams.direction]
  );

  const { data, error, loading, next } = useTableRequest({
    data: searchQuery
      ? getFilteredTemplates(templates.all, searchQuery)
      : templates.rootTemplates,
    sort,
    reqFn: templates.fetchPage,
    reqParams,
  });

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback(
    (template: Template) => {
      if (!expandedIds.has(template.id)) {
        void templates.fetchChildTemplates(template.id);
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(template.id)) {
          next.delete(template.id);
        } else {
          next.add(template.id);
        }
        return next;
      });
    },
    [templates, expandedIds]
  );

  // interleave the children of expanded templates into the sorted roots.
  // Intentionally not memoized so MobX tracks child templates as they load.
  const flattenTree = (roots: Template[]): Template[] => {
    const rows: Template[] = [];
    const seen = new Set<string>();
    const visit = (template: Template) => {
      if (seen.has(template.id)) {
        return;
      }
      seen.add(template.id);
      rows.push(template);
      if (expandedIds.has(template.id)) {
        template.childTemplates.forEach(visit);
      }
    };
    roots.forEach(visit);
    return rows;
  };

  const rows = data ? (searchQuery ? data : flattenTree(data)) : data;

  const isEmpty = !loading && !templates.all.length;

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

  const handleSearch = useCallback((event) => {
    const { value } = event.target;
    setQuery(value);
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(t("Could not load templates"));
    }
  }, [t, error]);

  useEffect(() => {
    const timeout = setTimeout(() => updateQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query, updateQuery]);

  return (
    <Scene
      title={t("Templates")}
      icon={<ShapesIcon />}
      actions={
        <>
          {can.readTemplate && (
            <Action>
              <NewTemplateMenu />
            </Action>
          )}
        </>
      }
      wide
    >
      <Heading>{t("Templates")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Templates help your team create consistent and accurate documentation.
        </Trans>
      </Text>
      {isEmpty ? (
        <Empty>{t("No templates have been created yet")}</Empty>
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
            <TemplatesTable
              data={rows ?? []}
              sort={sort}
              loading={loading}
              expandedIds={searchQuery ? undefined : expandedIds}
              onToggleExpand={searchQuery ? undefined : handleToggleExpand}
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

export default observer(Templates);
