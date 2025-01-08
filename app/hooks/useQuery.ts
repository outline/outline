import React from "react";
import { useLocation } from "react-router-dom";

export default function useQuery() {
  const location = useLocation();

  const query = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  return query;
}
