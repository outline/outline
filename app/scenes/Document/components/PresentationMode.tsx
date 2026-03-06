import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ExpandedIcon, CollapseIcon } from "outline-icons";
import styled, { useTheme } from "styled-components";
import Icon from "@shared/components/Icon";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import type { ProsemirrorData } from "@shared/types";
import { colorPalette } from "@shared/utils/collections";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useIdle from "~/hooks/useIdle";
import useKeyDown from "~/hooks/useKeyDown";

type Slide =
  | { type: "title"; title: string; icon?: string | null; iconColor?: string | null }
  | { type: "content"; content: ProsemirrorData[] };

interface Props {
  /** The document title. */
  title: string;
  /** The document icon. */
  icon?: string | null;
  /** The document icon color. */
  iconColor?: string | null;
  /** The prosemirror data for the document. */
  data: ProsemirrorData;
  /** Callback when presentation mode is closed. */
  onClose: () => void;
}

/**
 * Splits a ProseMirror document into slides based on heading and divider nodes.
 * A dedicated title slide is prepended. Each h1/h2 heading or horizontal rule
 * starts a new content slide. Divider nodes are consumed as separators and not
 * rendered on slides.
 *
 * @param data the prosemirror document data.
 * @param title the document title.
 * @param icon the document icon.
 * @param iconColor the document icon color.
 * @returns an array of slides.
 */
function splitIntoSlides(
  data: ProsemirrorData,
  title: string,
  icon?: string | null,
  iconColor?: string | null
): Slide[] {
  const content = data.content ?? [];
  const slides: Slide[] = [{ type: "title", title, icon, iconColor }];
  let currentNodes: ProsemirrorData[] = [];

  for (const node of content) {
    const isDivider = node.type === "horizontal_rule" || node.type === "hr";
    const isHeadingBreak =
      node.type === "heading" &&
      node.attrs &&
      typeof node.attrs.level === "number" &&
      node.attrs.level <= 2;

    if (isDivider) {
      if (currentNodes.length > 0) {
        slides.push({ type: "content", content: currentNodes });
        currentNodes = [];
      }
      continue;
    }

    if (isHeadingBreak && currentNodes.length > 0) {
      slides.push({ type: "content", content: currentNodes });
      currentNodes = [];
    }

    currentNodes.push(node);
  }

  if (currentNodes.length > 0) {
    slides.push({ type: "content", content: currentNodes });
  }

  return slides;
}

/**
 * Full-screen presentation mode that splits a document into slides by headings
 * and dividers, and allows navigating through them with keyboard controls.
 */
function PresentationMode({ title, icon, iconColor, data, onClose }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const slideContentRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const idleEvents = React.useMemo(
    () => ["click", "mousemove", "mousedown", "touchstart", "touchmove"],
    []
  );
  const isIdle = useIdle(3000, idleEvents);

  const slides = React.useMemo(
    () => splitIntoSlides(data, title, icon, iconColor),
    [data, title, icon, iconColor]
  );

  const totalSlides = slides.length;

  const goNext = React.useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = React.useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }, []);

  const goFirst = React.useCallback(() => {
    setCurrentSlide(0);
  }, []);

  const goLast = React.useCallback(() => {
    setCurrentSlide(totalSlides - 1);
  }, [totalSlides]);

  const toggleFullscreen = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {
        // ignore
      });
    } else {
      el.requestFullscreen().catch(() => {
        // ignore
      });
    }
  }, []);

  useKeyDown("Escape", onClose);
  useKeyDown("ArrowRight", goNext);
  useKeyDown("ArrowDown", goNext);
  useKeyDown("PageDown", goNext);
  useKeyDown("ArrowLeft", goPrev);
  useKeyDown("ArrowUp", goPrev);
  useKeyDown("PageUp", goPrev);
  useKeyDown("Home", goFirst);
  useKeyDown("End", goLast);
  useKeyDown(" ", goNext);
  useKeyDown("f", toggleFullscreen);

  // Prevent body scrolling while presentation is open
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Track fullscreen state changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // ignore
        });
      }
    };
  }, []);

  // Auto-scale slide content to fit available space
  React.useEffect(() => {
    const el = slideContentRef.current;
    const container = containerRef.current;
    if (!el || !container) {
      return;
    }

    const computeScale = () => {
      // Available area minus bottom bar (~48px) and padding
      const availableWidth = container.clientWidth - 160;
      const availableHeight = container.clientHeight - 48 - 80;

      // Reset scale to measure natural size
      el.style.transform = "none";
      const naturalWidth = el.scrollWidth;
      const naturalHeight = el.scrollHeight;

      if (naturalWidth === 0 || naturalHeight === 0) {
        setScale(1);
        return;
      }

      const scaleX = availableWidth / naturalWidth;
      const scaleY = availableHeight / naturalHeight;
      const newScale = Math.min(scaleX, scaleY, 1.5);
      setScale(Math.max(newScale, 0.5));
    };

    // Compute after render to allow editor to layout
    const timer = requestAnimationFrame(computeScale);
    window.addEventListener("resize", computeScale);
    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("resize", computeScale);
    };
  }, [currentSlide]);

  const slide = slides[currentSlide];

  const slideData: ProsemirrorData | undefined = React.useMemo(
    () =>
      slide.type === "content"
        ? { type: "doc", content: slide.content }
        : undefined,
    [slide]
  );

  const extensions = React.useMemo(() => richExtensions, []);

  return createPortal(
    <Container ref={containerRef} $background={theme.background} $idle={isIdle}>
      <SlideArea onClick={goNext}>
        <SlideContent ref={slideContentRef} style={{ transform: `scale(${scale})` }}>
          {slide.type === "title" ? (
            <TitleSlide>
              {slide.icon && (
                <TitleIcon>
                  <Icon
                    value={slide.icon}
                    color={slide.iconColor ?? colorPalette[0]}
                    size={64}
                    initial={slide.title[0]}
                  />
                </TitleIcon>
              )}
              <TitleText>{slide.title}</TitleText>
            </TitleSlide>
          ) : slideData ? (
            <Editor
              key={currentSlide}
              defaultValue={slideData}
              extensions={extensions}
              readOnly
              grow={false}
              placeholder=""
            />
          ) : null}
        </SlideContent>
      </SlideArea>
      <BottomBar $idle={isIdle}>
        <ExitText onClick={onClose}>
          <Text type="tertiary" size="small">
            {t("Exit")}
          </Text>
        </ExitText>
        <Flex align="center" gap={12}>
          <SlideNav onClick={goPrev} disabled={currentSlide === 0}>
            <Arrow>&#8249;</Arrow>
          </SlideNav>
          <SlideCounter>
            {currentSlide + 1} / {totalSlides}
          </SlideCounter>
          <SlideNav
            onClick={goNext}
            disabled={currentSlide === totalSlides - 1}
          >
            <Arrow>&#8250;</Arrow>
          </SlideNav>
        </Flex>
        <Tooltip content={t("Toggle fullscreen")} delay={500}>
          <FullscreenButton onClick={toggleFullscreen}>
            {isFullscreen ? (
              <CollapseIcon color="currentColor" />
            ) : (
              <ExpandedIcon color="currentColor" />
            )}
          </FullscreenButton>
        </Tooltip>
      </BottomBar>
    </Container>,
    document.body
  );
}

const Container = styled.div<{ $background: string; $idle: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: ${(props) => props.$background};
  display: flex;
  flex-direction: column;
  user-select: none;
  cursor: ${(props) => (props.$idle ? "none" : "default")};
`;

const SlideArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  padding: 40px 80px;
`;

const SlideContent = styled.div`
  max-width: 960px;
  width: 100%;
  cursor: default;
  transform-origin: center center;

  .ProseMirror {
    padding: 0;
    font-size: 1.4em;
  }

  h1 {
    font-size: 2.4em;
  }
  h2 {
    font-size: 1.8em;
  }
  h3 {
    font-size: 1.4em;
  }
`;

const TitleSlide = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 24px;
  min-height: 200px;
`;

const TitleIcon = styled.div`
  flex-shrink: 0;
`;

const TitleText = styled.h1`
  font-size: 3em;
  font-weight: 600;
  line-height: 1.25;
  margin: 0;
  color: ${s("text")};
`;

const BottomBar = styled.div<{ $idle: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  position: relative;
  opacity: ${(props) => (props.$idle ? 0 : 1)};
  transition: opacity 300ms ease;
`;

const SlideCounter = styled(Text)`
  font-variant-numeric: tabular-nums;
  color: ${s("textTertiary")};
  font-size: 14px;
  min-width: 60px;
  text-align: center;
`;

const SlideNav = styled.button<{ disabled?: boolean }>`
  background: none;
  border: none;
  cursor: ${(props) => (props.disabled ? "default" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.2 : 0.6)};
  padding: 4px 8px;
  transition: opacity 100ms ease;

  &:hover {
    opacity: ${(props) => (props.disabled ? 0.2 : 1)};
  }
`;

const Arrow = styled.span`
  font-size: 28px;
  line-height: 1;
  color: ${s("textTertiary")};
`;

const ExitText = styled.button`
  position: absolute;
  left: 24px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  color: ${s("textTertiary")};

  &:hover {
    color: ${s("text")};
  }
`;

const FullscreenButton = styled.button`
  position: absolute;
  right: 24px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: ${s("textTertiary")};
  display: flex;
  align-items: center;

  &:hover {
    color: ${s("text")};
  }
`;

export default PresentationMode;
