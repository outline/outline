import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Text from "~/components/Text";
import useWindowScrollPosition from "~/hooks/useWindowScrollPosition";

const HEADING_OFFSET = 20;

type Props = {
  /** Whether the document is rendering full width or not. */
  isFullWidth: boolean;
  /** The headings to render in the contents. */
  headings: {
    title: string;
    level: number;
    id: string;
  }[];
};

export default function Contents({ headings, isFullWidth }: Props) {
  const [activeSlug, setActiveSlug] = React.useState<string>();
  const position = useWindowScrollPosition({
    throttle: 100,
  });

  React.useEffect(() => {
    for (let key = 0; key < headings.length; key++) {
      const heading = headings[key];
      const element = window.document.getElementById(
        decodeURIComponent(heading.id)
      );

      if (element) {
        const bounding = element.getBoundingClientRect();

        if (bounding.top > HEADING_OFFSET) {
          const last = headings[Math.max(0, key - 1)];
          setActiveSlug(last.id);
          return;
        }
      }
    }
  }, [position, headings]);

  // calculate the minimum heading level and adjust all the headings to make
  // that the top-most. This prevents the contents from being weirdly indented
  // if all of the headings in the document start at level 3, for example.
  const minHeading = headings.reduce(
    (memo, heading) => (heading.level < memo ? heading.level : memo),
    Infinity
  );
  const headingAdjustment = minHeading - 1;
  const { t } = useTranslation();

  return (
    <Wrapper isFullWidth={isFullWidth}>
      <Sticky>
        <Heading>{t("Contents")}</Heading>
        {headings.length ? (
          <List>
            {headings
              .filter((heading) => heading.level < 4)
              .map((heading) => (
                <ListItem
                  key={heading.id}
                  level={heading.level - headingAdjustment}
                  active={activeSlug === heading.id}
                >
                  <Link href={`#${heading.id}`}>{heading.title}</Link>
                </ListItem>
              ))}
          </List>
        ) : (
          <Empty>
            {t("Headings you add to the document will appear here")}
          </Empty>
        )}
      </Sticky>
    </Wrapper>
  );
}

const Wrapper = styled.div<{ isFullWidth: boolean }>`
  width: 256px;
  display: none;

  ${breakpoint("tablet")`
    display: block;
  `};

  ${(props) =>
    !props.isFullWidth &&
    breakpoint("desktopLarge")`
    transform: translateX(-256px);
    width: 0;
    `}
`;

const Sticky = styled.div`
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 80px);

  background: ${s("background")};
  transition: ${s("backgroundTransition")};

  margin-top: 80px;
  margin-right: 52px;
  min-width: 204px;
  width: 228px;
  min-height: 40px;
  overflow-y: auto;
  padding: 0 16px;
  border-radius: 8px;

  @supports (backdrop-filter: blur(20px)) {
    backdrop-filter: blur(20px);
    background: ${(props) => transparentize(0.2, props.theme.background)};
  }
`;

const Heading = styled.h3`
  font-size: 13px;
  font-weight: 600;
  color: ${s("textTertiary")};
  letter-spacing: 0.03em;
  margin-top: 10px;
`;

const Empty = styled(Text)`
  margin: 1em 0 4em;
  padding-right: 2em;
  font-size: 14px;
`;

const ListItem = styled.li<{ level: number; active?: boolean }>`
  margin-left: ${(props) => (props.level - 1) * 10}px;
  margin-bottom: 8px;
  padding-right: 2em;
  line-height: 1.3;

  a {
    font-weight: ${(props) => (props.active ? "600" : "inherit")};
    color: ${(props) => (props.active ? props.theme.accent : props.theme.text)};
  }
`;

const Link = styled.a`
  color: ${s("text")};
  font-size: 14px;

  &:hover {
    color: ${s("accent")};
  }
`;

const List = styled.ol`
  padding: 0;
  list-style: none;
`;
