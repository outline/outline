import { useDirection } from "@radix-ui/react-direction";
import { throttle } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { CloseIcon, MenuIcon, SidebarIcon } from "outline-icons";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import styled, { css } from "styled-components";
import type { DefaultTheme } from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import useMeasure from "react-use-measure";
import { HEADER_HEIGHT, MOBILE_TOUCH_TARGET } from "@shared/constants";
import { depths, hover, s } from "@shared/styles";
import { metaDisplay } from "@shared/utils/keyboard";
import Button from "~/components/Button";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import { useSidebarCollapsed } from "~/components/SidebarCollapsedContext";
import { useSplitView } from "~/components/SplitView/context";
import Tooltip from "~/components/Tooltip";
import useEventListener from "~/hooks/useEventListener";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import useWindowScrollbarWidth from "~/hooks/useWindowScrollbarWidth";
import { draggableOnDesktop, fadeOnDesktopBackgrounded } from "~/styles";
import Desktop from "~/utils/Desktop";
import history from "~/utils/history";
import { closeSplitPane } from "~/utils/splitView";
import { TooltipProvider } from "./TooltipContext";

export { HEADER_HEIGHT };

type Props = {
  left?: React.ReactNode;
  title: React.ReactNode;
  actions?:
    | ((props: { isCompact: boolean }) => React.ReactNode)
    | React.ReactNode;
  hasSidebar?: boolean;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
};

function Header({ left, title, actions, hasSidebar, className, ref }: Props) {
  const { ui } = useStores();
  const { t } = useTranslation();
  const { pane, isSplitView } = useSplitView();
  const isMobile = useMobile();
  const sidebarCollapsed = useSidebarCollapsed();
  const hasMobileSidebar = hasSidebar && isMobile;
  const hasDesktopSidebar = hasSidebar && !isMobile;
  const [internalMeasureRef, size] = useMeasure();
  const scrollbarWidth = useWindowScrollbarWidth() ?? 0;
  const direction = useDirection();
  // The body spans the full viewport, so a header at the window end extends past the visible area.
  const isAtWindowEnd =
    size.width > 0 &&
    (direction === "rtl"
      ? size.left <= 1
      : size.right >= window.innerWidth - 1);
  const [breadcrumbsMeasureRef, breadcrumbsSize] = useMeasure();
  const passThrough = !actions && !left && !title && !isSplitView;

  const handleCloseSplitPane = React.useCallback(() => {
    closeSplitPane(history, pane);
  }, [pane]);

  const [isScrolled, setScrolled] = React.useState(false);
  const handleScroll = React.useMemo(
    () => throttle(() => setScrolled(window.scrollY > 75), 50),
    []
  );

  useEventListener("scroll", handleScroll, window, { passive: true });

  const handleClickTitle = React.useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const setBreadcrumbRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node?.firstElementChild) {
        breadcrumbsMeasureRef(node.firstElementChild as HTMLDivElement);
      }
    },
    [breadcrumbsMeasureRef]
  );

  const breadcrumbMakesCompact = breadcrumbsSize.width > size.width / 3;
  const isCompact = size.width < 1000 || breadcrumbMakesCompact;

  return (
    <TooltipProvider>
      <Wrapper
        ref={mergeRefs([ref, internalMeasureRef])}
        align="center"
        shrink={false}
        className={className}
        $passThrough={passThrough}
        $insetTitleAdjust={ui.sidebarIsClosed && Desktop.hasInsetTitlebar()}
        $scrollbarInset={isAtWindowEnd ? scrollbarWidth : undefined}
      >
        {hasDesktopSidebar && (
          <SidebarToggle
            $visible={sidebarCollapsed}
            aria-hidden={!sidebarCollapsed}
          >
            <Tooltip
              content={t("Toggle sidebar")}
              shortcut={`${metaDisplay}+.`}
              side="bottom"
            >
              <SidebarToggleButton
                $visible={sidebarCollapsed}
                aria-label={t("Expand sidebar")}
                onClick={ui.toggleCollapsedSidebar}
                icon={<SidebarIcon />}
                tabIndex={sidebarCollapsed ? undefined : -1}
                neutral
                borderOnHover
              />
            </Tooltip>
          </SidebarToggle>
        )}
        {left || hasMobileSidebar ? (
          <Breadcrumbs ref={setBreadcrumbRef}>
            {hasMobileSidebar && (
              <MobileMenuButton
                onClick={ui.toggleMobileSidebar}
                icon={<MenuIcon />}
                neutral
              />
            )}
            {left}
          </Breadcrumbs>
        ) : null}

        {isScrolled && !isCompact ? (
          <Title onClick={handleClickTitle}>
            <Fade>{title}</Fade>
          </Title>
        ) : (
          <div />
        )}
        <Actions align="center" justify="flex-end">
          {typeof actions === "function" ? actions({ isCompact }) : actions}
          {isSplitView && (
            <Tooltip content={t("Close pane")} side="bottom">
              <CloseSplitPaneButton
                aria-label={t("Close pane")}
                onClick={handleCloseSplitPane}
                icon={<CloseIcon />}
                neutral
                borderOnHover
              />
            </Tooltip>
          )}
        </Actions>
      </Wrapper>
    </TooltipProvider>
  );
}

/** Height of the fade at the bottom of the mobile header background. */
const HeaderFadeHeight = 64;

/** Eased mask stops for a fade of the given height, so it has no visible start or end. */
const fadeStops = (height: number) =>
  [1, 0.85, 0.5, 0.15, 0]
    .map(
      (opacity, index, stops) =>
        `rgb(0 0 0 / ${opacity}) calc(100% - ${height * (1 - index / (stops.length - 1))}px)`
    )
    .join(", ");

const headerFadeStops = fadeStops(HeaderFadeHeight);

/** Raised capsule that holds header buttons on mobile, like an iOS toolbar. */
const mobilePill = css`
  background: ${s("menuBackground")};
  box-shadow:
    0 0 0 1px ${s("divider")},
    0 4px 12px rgb(0 0 0 / 8%);
  border-radius: ${MOBILE_TOUCH_TARGET / 2}px;
`;

const Breadcrumbs = styled("div")`
  flex-grow: 1;
  flex-basis: 0;
  min-width: 0;
  align-items: center;
  padding-inline: 0 8px;
  display: flex;

  ${breakpoint("mobile", "tablet")`
    gap: 8px;

    && [data-variant] {
      ${mobilePill}
    }

    && [data-variant]:${hover}:not(:disabled),
    && [data-variant][aria-expanded="true"] {
      ${mobilePill}
      background: ${s("buttonNeutralBackground")};
    }
  `};

  ${breakpoint("tablet")`
    min-width: auto;
  `};
`;

const Actions = styled(Flex)`
  flex-grow: 1;
  flex-basis: 0;
  min-width: auto;
  padding-inline: 8px 0;
  gap: 8px;
  margin-inline-start: 8px;

  ${breakpoint("mobile", "tablet")`
    flex: 0 0 auto;
    gap: 0;
    margin-inline-start: auto;

    &:not(:empty) {
      ${mobilePill}
      padding-inline: 10px;
    }

    /* Touch targets overlap so icons sit closer than their 44px hit areas. */
    & > * {
      margin-inline: -4px;
    }

    && [data-variant] {
      background: transparent;
      box-shadow: none;
    }

    && [data-variant="primary"] {
      color: ${(props) =>
        props.theme.isDark ? props.theme.text : props.theme.accent};
    }

    && [data-variant="primary"]:disabled {
      color: ${s("textTertiary")};

      svg {
        fill: currentColor;
      }
    }

    && [data-variant]:${hover}:not(:disabled),
    && [data-variant][aria-expanded="true"] {
      background: ${s("buttonNeutralBackground")};
      box-shadow: none;
    }
  `};

  ${breakpoint("tablet")`
    position: unset;
  `};
`;

type WrapperProps = {
  $passThrough?: boolean;
  $insetTitleAdjust?: boolean;
  /** Width of the window scrollbar that the end of the header falls behind. */
  $scrollbarInset?: number;
};

/**
 * Padding for the end of the header that clears the window scrollbar. The
 * removed-body-scroll-bar-size variable is set while a modal locks the page
 * scroll, which keeps the padding constant as the scrollbar is removed.
 */
const endPadding = (base: number) => (props: WrapperProps) =>
  props.$scrollbarInset === undefined
    ? `${base}px`
    : `calc(${base}px + ${props.$scrollbarInset}px + var(--removed-body-scroll-bar-size, 0px))`;

const Wrapper = styled(Flex)<WrapperProps>`
  top: 0;
  z-index: ${depths.header};
  position: sticky;
  background: ${s("background")};

  ${(props) =>
    props.$passThrough
      ? `
      background: transparent;
      pointer-events: none;
      `
      : `
      background: ${transparentize(0.2, props.theme.background)};
      backdrop-filter: blur(20px);
      `};

  padding: 6px 16px;
  padding-inline-end: ${endPadding(16)};
  transform: translate3d(0, 0, 0);
  min-height: ${HEADER_HEIGHT}px;
  justify-content: flex-start;
  ${draggableOnDesktop()}

  button,
  [role="button"] {
    ${fadeOnDesktopBackgrounded()}
  }

  @supports (backdrop-filter: blur(20px)) {
    ${(props) =>
      !props.$passThrough &&
      `
      backdrop-filter: blur(20px);
      background: ${transparentize(0.2, props.theme.background)};
      `}
  }

  @media print {
    display: none;
  }

  ${breakpoint("mobile", "tablet")`
    ${(props: WrapperProps & { theme: DefaultTheme }) =>
      !props.$passThrough &&
      `
      background: transparent;
      backdrop-filter: none;

      /* The blurred background extends past the header and fades out, so content blends under it. */
      &::before {
        content: "";
        position: absolute;
        inset: 0 0 -${HeaderFadeHeight / 2}px;
        z-index: -1;
        pointer-events: none;
        background: ${transparentize(0.2, props.theme.background)};
        backdrop-filter: blur(20px);
        mask-image: linear-gradient(to bottom, ${headerFadeStops});
      }

      /* A stuck tab bar or table header continues the header, so the header is solid above it. */
      body:has([data-stuck]) &::before {
        inset: 0;
        background: ${props.theme.background};
        backdrop-filter: none;
        mask-image: none;
      }

      /* iOS blurs the top of an installed web app unless the sticky header has a solid background. */
      @media (display-mode: standalone) {
        background: ${props.theme.background};

        &::before {
          background: ${props.theme.background};
          mask-image: linear-gradient(to bottom, ${fadeStops(HeaderFadeHeight / 2)});
        }
      }
      `}
  `};

  ${breakpoint("tablet")`
    padding: 12px;
    padding-inline-end: ${endPadding(12)};
    ${(props: WrapperProps) => props.$insetTitleAdjust && `padding-left: 64px;`}
    `};
`;

const Title = styled("div")`
  display: none;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  cursor: var(--pointer);
  min-width: 0;

  ${breakpoint("tablet")`
    padding-left: 0;
    display: block;
  `};

  svg {
    vertical-align: bottom;
  }

  @media (display-mode: standalone) {
    overflow: hidden;
    flex-grow: 0 !important;
  }
`;

const MobileMenuButton = styled(Button)`
  pointer-events: auto;

  @media print {
    display: none;
  }
`;

const SidebarToggle = styled("div")<{ $visible: boolean }>`
  flex-shrink: 0;
  overflow: hidden;
  width: ${(props) => (props.$visible ? 32 : 0)}px;
  margin-inline-end: ${(props) => (props.$visible ? 8 : 0)}px;
  pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
  transition:
    width 150ms ease-out,
    margin 150ms ease-out;

  @media print {
    display: none;
  }
`;

const SidebarToggleButton = styled(Button)<{ $visible: boolean }>`
  color: ${s("textTertiary")};
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: opacity 150ms ease-out;

  &:hover:not(:disabled) {
    color: ${s("textSecondary")};
  }

  [dir="rtl"] & svg {
    transform: scaleX(-1);
  }
`;

const CloseSplitPaneButton = styled(Button)`
  pointer-events: auto;
`;

export default observer(Header);
