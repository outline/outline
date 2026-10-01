import { observer } from "mobx-react";
import { CloseIcon, HashtagIcon } from "outline-icons";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import FilterOptions, { StyledButton } from "~/components/FilterOptions";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import { toggleTagId } from "~/utils/tags";

type Props = {
  /** The ids of the selected tags, all of which documents must have. */
  tagIds: string[];
  /** Ids in the URL that match no tag, shown so they can be removed. */
  unknownTagIds: string[];
  /** Callback with every tag id to keep in the URL when the selection changes. */
  onSelect: (tagIds: string[]) => void;
};

/**
 * Multi select of tags to filter search results by, the selected tags are
 * shown as removable chips.
 */
function TagFilter({ tagIds, unknownTagIds, onSelect }: Props) {
  const { t } = useTranslation();
  const { tags } = useStores();
  const [loaded, setLoaded] = useState(false);

  // Tags are fetched once the dropdown opens rather than on every mount, the
  // search scene already loads them when the URL has tag filters.
  const handleOpen = useCallback(() => {
    void tags
      .fetchAllIfNeeded()
      .then(() => setLoaded(true))
      .catch((err) => toast.error(errToString(err)));
  }, [tags]);

  const options = useMemo(
    () =>
      tags.orderedData.map((tag) => ({
        key: tag.id,
        label: `#${tag.name}`,
        icon: <HashtagIcon size={24} color={tag.color ?? undefined} />,
      })),
    [tags.orderedData]
  );

  const selected = tagIds
    .map((id) => tags.get(id))
    .filter((tag) => tag !== undefined);

  if (loaded && !options.length && !tagIds.length && !unknownTagIds.length) {
    return null;
  }

  return (
    <>
      <FilterOptions
        options={options}
        selectedKeys={tagIds}
        onSelect={(key) =>
          key && onSelect([...toggleTagId(tagIds, key), ...unknownTagIds])
        }
        onOpen={handleOpen}
        defaultLabel={t("Any tag")}
        label={t("Tags")}
        showFilter
      />
      {selected.map((tag) => (
        <Tooltip key={tag.id} content={t("Remove tag filter")}>
          <StyledButton
            onClick={() =>
              onSelect([
                ...tagIds.filter((id) => id !== tag.id),
                ...unknownTagIds,
              ])
            }
            icon={<CloseIcon />}
            aria-label={t("Remove tag filter {{name}}", { name: tag.name })}
            neutral
          >
            #{tag.name}
          </StyledButton>
        </Tooltip>
      ))}
      {unknownTagIds.map((unknownId) => (
        <Tooltip key={unknownId} content={t("Remove tag filter")}>
          <StyledButton
            onClick={() =>
              onSelect([
                ...tagIds,
                ...unknownTagIds.filter((id) => id !== unknownId),
              ])
            }
            icon={<CloseIcon />}
            aria-label={t("Remove unknown tag filter")}
            neutral
          >
            {t("Unknown tag")}
          </StyledButton>
        </Tooltip>
      ))}
    </>
  );
}

export default observer(TagFilter);
