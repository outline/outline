import { ColumnSort } from "@tanstack/react-table";
import * as React from "react";
import { useHistory, useLocation } from "react-router-dom";
import useQuery from "~/hooks/useQuery";
import lazyWithRetry from "~/utils/lazyWithRetry";
import type { Props as TableProps } from "./Table";

const Table = lazyWithRetry(() => import("~/components/Table"));

export type Props<T> = Omit<TableProps<T>, "onChangeSort">;

export function SortableTable<T>(props: Props<T>) {
  const location = useLocation();
  const history = useHistory();
  const params = useQuery();

  const handleChangeSort = React.useCallback(
    (sort: ColumnSort) => {
      params.set("sort", sort.id);
      params.set("direction", sort.desc ? "desc" : "asc");

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  return <Table onChangeSort={handleChangeSort} {...props} />;
}
