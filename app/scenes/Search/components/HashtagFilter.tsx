import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import { useMemo } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";

type Props = {
  /** The currently selected hashtag */
  hashtag: string | undefined;
  /** Callback to call when a hashtag is selected */
  onSelect: (key: string | undefined) => void;
};

type HashtagListResponse = {
  data: string[];
  counts?: Record<string, number>;
};

/**
 * Filter to select a hashtag for search.
 *
 * @param props The component props.
 * @returns The filter options component.
 */
function HashtagFilter(props: Props) {
  const { onSelect, hashtag } = props;
  const { t } = useTranslation();

  const fetchHashtags = React.useCallback(
    () =>
      client.post<HashtagListResponse>("/hashtags.list", {
        sort: "count",
        limit: 200,
      }),
    []
  );
  const { data } = useRequest(fetchHashtags, true);

  const options = useMemo(() => {
    const counts = data?.counts ?? {};
    const tagOptions =
      data?.data.map((tag) => ({
        key: tag,
        label: counts[tag] ? `#${tag} (${counts[tag]})` : `#${tag}`,
        icon: <HashtagIcon size={20} />,
      })) ?? [];

    return [
      {
        key: "",
        label: t("Any hashtag"),
        icon: <HashtagIcon size={20} />,
      },
      ...tagOptions,
    ];
  }, [data?.data, data?.counts, t]);

  return (
    <FilterOptions
      options={options}
      selectedKeys={[hashtag]}
      onSelect={onSelect}
      defaultLabel={t("Any hashtag")}
      showFilter
    />
  );
}

export default observer(HashtagFilter);
