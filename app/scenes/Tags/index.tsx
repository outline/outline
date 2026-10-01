import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import queryString from "query-string";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import type Tag from "~/models/Tag";
import { SortInput } from "~/scenes/Tags/components/SortInput";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import ListItem from "~/components/List/Item";
import PlaceholderList from "~/components/List/Placeholder";
import Scene from "~/components/Scene";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import TagMenu from "~/menus/TagMenu";
import { searchPath } from "~/utils/routeHelpers";
import type { TagSort } from "~/utils/tags";
import { sortTags } from "~/utils/tags";

/**
 * Workspace tags index page, listing the tags visible to the user sorted by
 * name or document count.
 */
function Tags() {
  const { t } = useTranslation();
  const { tags } = useStores();
  const team = useCurrentTeam();
  const canCreate = !!usePolicy(team).createTag;
  const history = useHistory();
  const location = useLocation();

  // Always refetch, document counts change as tags are applied elsewhere.
  const { loaded, error } = useRequest(tags.fetchAll, true);

  const params = new URLSearchParams(location.search);
  const sort: TagSort =
    params.get("sort") === "documentCount" ? "documentCount" : "name";
  const direction =
    params.get("direction") === "DESC" ||
    (!params.has("direction") && sort === "documentCount")
      ? "DESC"
      : "ASC";
  const sorted = sortTags(tags.orderedData, sort, direction);

  const handleSortChange = (sort: TagSort, direction: "ASC" | "DESC") => {
    history.replace({
      pathname: location.pathname,
      search: queryString.stringify({
        ...queryString.parse(location.search),
        sort,
        direction,
      }),
    });
  };

  const sortInput = (
    <SortInput sort={sort} direction={direction} onSelect={handleSortChange} />
  );

  return (
    <Scene icon={<HashtagIcon />} title={t("Tags")} actions={sortInput}>
      <Heading>{t("Tags")}</Heading>
      {sorted.length > 0 ? (
        <List>
          {sorted.map((tag) => (
            <TagListItem key={tag.id} tag={tag} />
          ))}
        </List>
      ) : error ? (
        <Empty>{t("Tags could not be loaded, please try again.")}</Empty>
      ) : loaded ? (
        <Empty>
          {canCreate
            ? t("No tags have been created yet.")
            : t("There are no tags to show.")}
        </Empty>
      ) : (
        <PlaceholderList count={5} />
      )}
    </Scene>
  );
}

const TagListItem = observer(function TagListItem({ tag }: { tag: Tag }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const can = usePolicy(tag);
  const canManage = !!(can.update || can.merge || can.delete);

  return (
    <ListItem
      to={searchPath({ tagId: tag.id })}
      image={<HashtagIcon color={tag.color ?? theme.textSecondary} />}
      title={`#${tag.name}`}
      subtitle={t("{{ count }} document", { count: tag.documentCount })}
      actions={
        canManage ? (
          <EventBoundary>
            <TagMenu tag={tag} />
          </EventBoundary>
        ) : undefined
      }
      enableEllipsis
      border={false}
    />
  );
});

const List = styled.div`
  margin-top: 8px;
`;

export default observer(Tags);
