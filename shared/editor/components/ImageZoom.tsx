import { transparentize } from "polished";
import * as React from "react";
import styled, { createGlobalStyle } from "styled-components";
import EventBoundary from "../../components/EventBoundary";
import { s } from "../../styles";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

const Zoom = React.lazy(() => import("react-medium-image-zoom"));

type Props = {
  /** An optional caption to display below the image */
  caption?: string;
  children: React.ReactNode;
};

/**
 * Component that wraps an image with the ability to zoom in
 */
export const ImageZoom = ({ caption, children }: Props) => {
  const [isActivated, setIsActivated] = React.useState(false);

  const handleActivated = React.useCallback(() => {
    setIsActivated(true);
  }, []);

  const fallback = (
    <span onPointerEnter={handleActivated} onFocus={handleActivated}>
      {children}
    </span>
  );

  const ZoomContent = React.useMemo(
    () =>
      function ZoomContentComponent(
        props: Omit<React.ComponentProps<typeof Lightbox>, "caption">
      ) {
        return <Lightbox caption={caption} {...props} />;
      },
    [caption]
  );

  if (!isActivated) {
    return fallback;
  }

  return (
    <React.Suspense fallback={fallback}>
      <Styles />
      <EventBoundary captureEvents="click">
        <Zoom zoomMargin={EditorStyleHelper.padding} ZoomContent={ZoomContent}>
          <div>{children}</div>
        </Zoom>
      </EventBoundary>
    </React.Suspense>
  );
};

const Lightbox = ({
  caption,
  modalState,
  img,
}: {
  caption: string | undefined;
  modalState: string;
  img: React.ReactNode;
}) => (
  <Figure>
    {img}
    <Caption $loaded={modalState === "LOADED"}>{caption}</Caption>
  </Figure>
);

const Figure = styled("figure")`
  margin: 0;
`;

const Caption = styled("figcaption")<{ $loaded: boolean }>`
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  font-size: 14px;
  opacity: ${(props) => (props.$loaded ? 1 : 0)};
  transition: opacity 250ms;

  font-weight: normal;
  color: ${s("textSecondary")};
`;

const Styles = createGlobalStyle`
  [data-rmiz-ghost] {
    position: absolute;
    pointer-events: none;
  }
  [data-rmiz-btn-zoom],
  [data-rmiz-btn-unzoom] {
    display: none;
  }
  [data-rmiz-btn-zoom]:not(:focus):not(:active) {
    position: absolute;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    pointer-events: none;
    white-space: nowrap;
    width: 1px;
  }
  [data-rmiz-btn-zoom] {
    position: absolute;
    inset: 10px 10px auto auto;
    cursor: zoom-in;
  }
  [data-rmiz-btn-unzoom] {
    position: absolute;
    inset: 20px 20px auto auto;
    cursor: zoom-out;
    z-index: 1;
  }
  [data-rmiz-content="found"] img,
  [data-rmiz-content="found"] svg,
  [data-rmiz-content="found"] [role="img"],
  [data-rmiz-content="found"] [data-zoom] {
    cursor: zoom-in;
  }
  [data-rmiz-modal] {
    outline: none;
  }
  [data-rmiz-modal]::backdrop {
    display: none;
  }
  [data-rmiz-modal][open] {
    position: fixed;
    width: 100vw;
    width: 100dvw;
    height: 100vh;
    height: 100dvh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    overflow: hidden;
  }
  [data-rmiz-modal-overlay] {
    position: absolute;
    inset: 0;
    transition: background-color 0.3s;
  }
  [data-rmiz-modal-overlay="hidden"] {
    background-color: ${(props) => transparentize(1, props.theme.background)};
  }
  [data-rmiz-modal-overlay="visible"] {
    background-color: ${s("background")};
  }
  [data-rmiz-modal-content] {
    position: relative;
    width: 100%;
    height: 100%;
  }
  [data-rmiz-modal-img] {
    position: absolute;
    cursor: zoom-out;
    image-rendering: high-quality;
    transform-origin: top left;
    transition: transform 0.3s;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-rmiz-modal-overlay],
    [data-rmiz-modal-img] {
      transition-duration: 0.01ms !important;
    }
  }
`;
