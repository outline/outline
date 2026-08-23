import { observer } from "mobx-react";
import { transparentize } from "polished";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { EmojiText } from "@shared/components/EmojiText";
import { HeadingPrefixHelper } from "@shared/editor/extensions/HeadingPrefix";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { DocumentPreference, HeadingPrefixStyle } from "@shared/types";
import { depths, hideScrollbars, s } from "@shared/styles";
import { supportsPassiveListener } from "@shared/utils/browser";
import { useDocumentContext } from "~/components/DocumentContext";
import useWindowScrollPosition from "~/hooks/useWindowScrollPosition";
import { patchLocation } from "~/utils/history";
import { decodeURIComponentSafe } from "~/utils/urls";

const HEADING_OFFSET = 20;

/** Headings deeper than this level are not listed in the contents. */
const MAX_HEADING_LEVEL = 4;

function Contents() {
  const history = useHistory();
  const [scrolledSlug, setScrolledSlug] = useState<string>();
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const scrollPosition = useWindowScrollPosition({
    throttle: 100,
  });
  const documentContext = useDocumentContext();
  // Headings inside tables carry no number and are not listed.
  const headings = useMemo(
    () => documentContext.headings.filter((heading) => !heading.inTable),
    [documentContext.headings]
  );
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const headingPrefix =
    documentContext.document?.getPreference(DocumentPreference.HeadingPrefix) ??
    HeadingPrefixStyle.None;

  // Prefix labels are computed over every heading so that they match the
  // numbering shown in the document, and attached before the deeper headings
  // are dropped. Those headings are not listed, so they also take no part in
  // tracking the active one — a reader inside a deep section keeps the nearest
  // listed heading highlighted rather than losing the highlight entirely.
  const items = useMemo(() => {
    const labels =
      headingPrefix === HeadingPrefixStyle.None
        ? undefined
        : HeadingPrefixHelper.labels(
            headings.map((heading) => heading.level),
            headingPrefix,
            { indented: true }
          );

    return headings
      .map((heading, index) => ({ heading, label: labels?.[index] }))
      .filter(({ heading }) => heading.level <= MAX_HEADING_LEVEL);
  }, [headings, headingPrefix]);

  // A heading chosen from the contents stays highlighted until the reader
  // scrolls themselves. Headings near the end of a document cannot reach the
  // top of the viewport, so the scroll position alone would never select them.
  const activeSlug =
    selectedSlug && items.some(({ heading }) => heading.id === selectedSlug)
      ? selectedSlug
      : scrolledSlug;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      // Let modified clicks (open in new tab, copy link, etc.) fall through to
      // the native anchor behavior.
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      // Navigate via history so the location state (active sidebar context) is
      // retained rather than dropped by a native hash navigation.
      event.preventDefault();
      setSelectedSlug(id);
      history.push(patchLocation(history.location, { hash: `#${id}` }));

      // Scroll from here rather than relying on the hash changing, so that
      // clicking the same heading again still moves the reader to it.
      void documentContext.editor?.scrollToAnchor(`#${id}`);
    },
    [history, documentContext]
  );

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    // Navigating to the heading scrolls the document during the same commit,
    // so the position here is the one it came to rest at. Any movement away
    // from it is the reader scrolling, whichever means they use.
    const restingPosition = window.pageYOffset;

    const handleScroll = () => {
      if (window.pageYOffset !== restingPosition) {
        setSelectedSlug(undefined);
      }
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      supportsPassiveListener ? { passive: true } : false
    );

    return () => window.removeEventListener("scroll", handleScroll);
  }, [selectedSlug]);

  useEffect(() => {
    let activeId = items.length > 0 ? items[0].heading.id : undefined;

    for (const { heading } of items) {
      const element = window.document.getElementById(
        decodeURIComponentSafe(heading.id)
      );

      if (element) {
        const bounding = element.getBoundingClientRect();
        if (bounding.top > HEADING_OFFSET) {
          break;
        }
        activeId = heading.id;
      }
    }

    if (scrolledSlug !== activeId) {
      setScrolledSlug(activeId);
    }
  }, [scrollPosition, items, scrolledSlug]);

  useEffect(() => {
    const activeItem = activeSlug ? itemRefs.current[activeSlug] : undefined;

    if (activeItem) {
      activeItem.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeSlug]);

  // calculate the minimum heading level and adjust all the headings to make
  // that the top-most. This prevents the contents from being weirdly indented
  // if all of the headings in the document start at level 3, for example.
  const minHeading = items.reduce(
    (memo, { heading }) => (heading.level < memo ? heading.level : memo),
    Infinity
  );
  const headingAdjustment = minHeading - 1;
  const { t } = useTranslation();

  if (items.length === 0) {
    return <StickyWrapper />;
  }

  return (
    <StickyWrapper>
      <Heading>{t("Contents")}</Heading>
      <List>
        {items.map(({ heading, label }) => (
          <ListItem
            key={heading.id}
            ref={(el) => (itemRefs.current[heading.id] = el)}
            level={heading.level - headingAdjustment}
            active={activeSlug === heading.id}
          >
            <Link
              href={`#${heading.id}`}
              onClick={(event) => handleClick(event, heading.id)}
            >
              {label && <Prefix>{label}</Prefix>}
              <EmojiText>{heading.title}</EmojiText>
            </Link>
          </ListItem>
        ))}
      </List>
    </StickyWrapper>
  );
}

const StickyWrapper = styled.div`
  display: none;
  position: sticky;
  top: 90px;
  max-height: calc(100vh - 90px);
  width: ${EditorStyleHelper.tocWidth}px;

  ${hideScrollbars()}

  padding: 0 16px;
  overflow-y: auto;
  border-radius: 8px;
  background: ${s("background")};

  @supports (backdrop-filter: blur(20px)) {
    backdrop-filter: blur(20px);
    background: ${(props) => transparentize(0.2, props.theme.background)};
  }

  ${breakpoint("tablet")`
    display: block;
    z-index: ${depths.toc};
  `};
`;

const Heading = styled.h3`
  font-size: 13px;
  font-weight: 600;
  color: ${s("textTertiary")};
  letter-spacing: 0.03em;
  margin-top: 10px;
`;

const Prefix = styled.span`
  color: ${s("textSecondary")};
  margin-inline-end: 0.25em;
  user-select: none;
`;

const ListItem = styled.li<{ level: number; active?: boolean }>`
  margin-left: ${(props) => (props.level - 1) * 10}px;
  margin-bottom: 8px;
  line-height: 1.3;
  word-break: break-word;

  a {
    font-weight: ${(props) => (props.active ? "600" : "inherit")};
    color: ${(props) => (props.active ? props.theme.accent : props.theme.text)};

    ${Prefix} {
      color: ${(props) =>
        props.active ? props.theme.accent : props.theme.textSecondary};
    }
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

export default observer(Contents);
