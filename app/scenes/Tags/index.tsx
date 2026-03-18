import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { searchPath } from "~/utils/routeHelpers";

/**
 * Workspace tags index page. Lists all tags in the team sorted by usage.
 */
function Tags() {
  const { t } = useTranslation();
  const { tags } = useStores();

  React.useEffect(() => {
    void tags.fetchPage();
  }, [tags]);

  return (
    <Scene icon={<HashtagIcon />} title={t("Tags")}>
      <Heading>{t("Tags")}</Heading>
      {tags.orderedData.length === 0 ? (
        <Empty>{t("No tags have been created yet.")}</Empty>
      ) : (
        <TagGrid>
          {tags.orderedData.map((tag) => (
            <TagCard key={tag.id} to={searchPath({ query: `#${tag.name}` })}>
              <TagName size="medium" weight="bold">
                #{tag.name}
              </TagName>
              <Text type="tertiary" size="xsmall">
                {t("{{ count }} document", { count: tag.documentCount })}
              </Text>
            </TagCard>
          ))}
        </TagGrid>
      )}
    </Scene>
  );
}

const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const TagCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  border-radius: 8px;
  background: ${({ theme }) => theme.listItemHoverBackground};
  text-decoration: none;
  min-width: 120px;

  &:hover {
    background: ${({ theme }) => theme.menuBackground};
    text-decoration: none;
  }
`;

const TagName = styled(Text)`
  color: ${({ theme }) => theme.text};
`;

export default observer(Tags);
