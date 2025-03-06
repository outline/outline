import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import { ConditionalFade } from "~/components/Fade";
import useStores from "~/hooks/useStores";
import RecentSearchListItem from "./RecentSearchListItem";

type Props = {
  /** Callback when the Escape key is pressed while navigating the list */
  onEscape?: (ev: React.KeyboardEvent<HTMLDivElement>) => void;
};

function RecentSearches(
  { onEscape }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const { searches } = useStores();
  const { t } = useTranslation();

  React.useEffect(() => {
    void searches.fetchPage({
      source: "app",
    });
  }, [searches]);

  const content = searches.recent.length ? (
    <>
      <Heading>{t("Recent searches")}</Heading>
      <StyledArrowKeyNavigation
        ref={ref}
        onEscape={onEscape}
        aria-label={t("Recent searches")}
        items={searches.recent}
      >
        {() =>
          searches.recent.map((searchQuery) => (
            <RecentSearchListItem
              key={searchQuery.id}
              searchQuery={searchQuery}
            />
          ))
        }
      </StyledArrowKeyNavigation>
    </>
  ) : null;

  return (
    <ConditionalFade animate={!searches.recent.length}>
      {content}
    </ConditionalFade>
  );
}

const Heading = styled.h2`
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  color: ${s("textSecondary")};
  margin: 12px 0 0;
`;

const StyledArrowKeyNavigation = styled(ArrowKeyNavigation)`
  padding: 0;
  margin-top: 8px;
`;

export default observer(React.forwardRef(RecentSearches));
