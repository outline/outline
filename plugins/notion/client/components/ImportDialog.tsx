import React from "react";
import { toast } from "sonner";
import useQuery from "~/hooks/useQuery";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";
import { Page } from "plugins/notion/shared/types";

export function ImportDialog() {
  const queryParams = useQuery();
  const integrationId = queryParams.get("integrationId"); // integration id will be available here since dialog renders only in success case.

  const loadRootPages = React.useCallback(async () => {
    const res = await client.post("/notion.search", {
      integrationId,
    });
    return res.data;
  }, [integrationId]);

  const {
    data: pages,
    error,
    loading,
  } = useRequest<Page[]>(loadRootPages, true);

  if (loading) {
    return <div>Loading data</div>;
  }

  if (error) {
    toast.error("Error while fetching page info from Notion");
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      {pages?.map((page) => (
        <div>{page.name}</div>
      ))}
    </div>
  );
}
