import type { ColumnSort } from "@tanstack/react-table";
import { useCallback } from "react";
import { useHistory } from "react-router-dom";
import lazyWithRetry from "~/utils/lazyWithRetry";
import type { Props as TableProps, RowData } from "./Table";

const Table = lazyWithRetry(() => import("~/components/Table"));

export type Props<T> = Omit<TableProps<T>, "onChangeSort">;

export function SortableTable<T extends RowData>(props: Props<T>) {
  const history = useHistory();

  const handleChangeSort = useCallback(
    (sort: ColumnSort) => {
      const { pathname, search } = history.location;
      const params = new URLSearchParams(search);
      params.set("sort", sort.id);
      params.set("direction", sort.desc ? "desc" : "asc");

      history.replace({
        pathname,
        search: params.toString(),
      });
    },
    [history]
  );

  return <Table onChangeSort={handleChangeSort} {...props} />;
}
