import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Text from "~/components/Text";
import useWindowScrollPosition from "~/hooks/useWindowScrollPosition";

const HEADING_OFFSET = 20;

type Props = {
  isFullWidth: boolean;
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
  // if all of the headings in the document are level 3, for example.
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
            {headings.map((heading) => (
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

  box-shadow: 1px 0 0 ${(props) => props.theme.divider};
  margin-top: 40px;
  margin-right: 52px;
  min-width: 204px;
  width: 204px;
  min-height: 40px;
  overflow-y: auto;
`;

const Heading = styled.h3`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${(props) => props.theme.sidebarText};
  letter-spacing: 0.04em;
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
  border-right: 3px solid
    ${(props) => (props.active ? props.theme.divider : "transparent")};

  a {
    color: ${(props) =>
      props.active ? props.theme.primary : props.theme.text};
  }
`;

const Link = styled.a`
  color: ${(props) => props.theme.text};
  font-size: 14px;

  &:hover {
    color: ${(props) => props.theme.primary};
  }
`;

const List = styled.ol`
  padding: 0;
  list-style: none;
`;
