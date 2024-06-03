import { transparentize } from "polished";
import * as React from "react";
import Zoom from "react-medium-image-zoom";
import { createGlobalStyle } from "styled-components";
import { s } from "../../styles";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

type Props = {
  children: React.ReactNode;
};

/**
 * Component that wraps an image with the ability to zoom in
 */
export const ImageZoom = (props: Props) => {
  const [isActivated, setIsActivated] = React.useState(false);

  const handleActivated = React.useCallback(() => {
    setIsActivated(true);
  }, []);

  if (!isActivated) {
    return (
      <span onPointerEnter={handleActivated} onFocus={handleActivated}>
        {props.children}
      </span>
    );
  }

  return (
    <>
      <Styles />
      <Zoom zoomMargin={EditorStyleHelper.padding}>
        <div>{props.children}</div>
      </Zoom>
    </>
  );
};

const Styles = createGlobalStyle`
  [data-rmiz] {
    position: relative;
  }
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
