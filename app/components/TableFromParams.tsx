import { observer } from "mobx-react";
import * as React from "react";
import { useHistory, useLocation } from "react-router-dom";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import useQuery from "~/hooks/useQuery";
import lazyWithRetry from "~/utils/lazyWithRetry";
import type { Props } from "./Table";

const Table = lazyWithRetry(() => import("~/components/Table"));

const TableFromParams = (
  props: Omit<Props, "onChangeSort" | "onChangePage" | "topRef">
) => {
  const topRef = React.useRef();
  const location = useLocation();
  const history = useHistory();
  const params = useQuery();

  const handleChangeSort = React.useCallback(
    (sort, direction) => {
      if (sort) {
        params.set("sort", sort);
      } else {
        params.delete("sort");
      }

      params.set("direction", direction.toLowerCase());

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });
    },
    [params, history, location.pathname]
  );

  const handleChangePage = React.useCallback(
    (page) => {
      if (page) {
        params.set("page", page.toString());
      } else {
        params.delete("page");
      }

      history.replace({
        pathname: location.pathname,
        search: params.toString(),
      });

      if (topRef.current) {
        scrollIntoView(topRef.current, {
          scrollMode: "if-needed",
          behavior: "auto",
          block: "start",
        });
      }
    },
    [params, history, location.pathname]
  );

  return (
    <Table
      topRef={topRef}
      onChangeSort={handleChangeSort}
      onChangePage={handleChangePage}
      {...props}
    />
  );
};

export default observer(TableFromParams);
