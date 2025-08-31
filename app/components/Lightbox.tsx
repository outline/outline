import { useEditor } from "~/editor/components/EditorContext";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import * as Dialog from "@radix-ui/react-dialog";
import { findChildren } from "@shared/editor/queries/findChildren";
import findIndex from "lodash/findIndex";
import styled, { css, Keyframes, keyframes } from "styled-components";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { sanitizeUrl } from "@shared/utils/urls";
import { Error } from "@shared/editor/components/Image";
import {
  BackIcon,
  CloseIcon,
  CrossIcon,
  DownloadIcon,
  NextIcon,
} from "outline-icons";
import { depths, s } from "@shared/styles";
import NudeButton from "./NudeButton";
import useIdle from "~/hooks/useIdle";
import { Second } from "@shared/utils/time";
import { downloadImageNode } from "@shared/editor/nodes/Image";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useTranslation } from "react-i18next";
import Tooltip from "~/components/Tooltip";
import LoadingIndicator from "./LoadingIndicator";

namespace Status {
  export enum Lightbox {
    READY_TO_OPEN,
    OPENING,
    OPENED,
    READY_TO_CLOSE,
    CLOSING,
    CLOSED,
  }

  export enum Image {
    LOADING,
    ERROR,
    LOADED,
  }
}

const ANIMATION_DURATION = 0.3 * Second.ms;
function Lightbox() {
  const { view } = useEditor();
  const { ui } = useStores();
  const isIdle = useIdle(3 * Second.ms);
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const { activeLightboxImgPos } = ui;
  const [status, setStatus] = useState<{
    lightbox: Status.Lightbox | null;
    image: Status.Image | null;
  }>({ lightbox: null, image: null });
  const animation = useRef<{
    fadeIn?: { apply: () => Keyframes; duration: number };
    fadeOut?: { apply: () => Keyframes; duration: number };
    zoomIn?: { apply: () => Keyframes; duration: number };
    zoomOut?: { apply: () => Keyframes; duration: number };
    startTime?: number;
  } | null>(null);
  const finalImagePosition = useRef<{
    center: { x: number; y: number };
    width: number;
    height: number;
  } | null>(null);

  // Debugging status changes
  // useEffect(() => {
  //   console.log(
  //     `lstat:${status.lightbox === null ? status.lightbox : Status.Lightbox[status.lightbox]}, istat:${status.image === null ? status.image : Status.Image[status.image]}`
  //   );
  // }, [status]);

  useEffect(() => () => view.focus(), []);

  useEffect(() => {
    !!activeLightboxImgPos &&
      setStatus({
        lightbox: Status.Lightbox.READY_TO_OPEN,
        image: status.image,
      });
  }, [!!activeLightboxImgPos]);

  useEffect(() => {
    if (status.image === Status.Image.LOADED) {
      rememberImagePosition();
    }
  }, [status.image]);

  useEffect(() => {
    if (
      (status.image === Status.Image.ERROR ||
        status.image === Status.Image.LOADED) &&
      status.lightbox === Status.Lightbox.READY_TO_OPEN
    ) {
      setupFadeIn();
      setupZoomIn();
      setStatus({
        lightbox: Status.Lightbox.OPENING,
        image: status.image,
      });
    }
  }, [status.image, status.lightbox]);

  useEffect(() => {
    if (status.lightbox === Status.Lightbox.READY_TO_CLOSE) {
      setupFadeOut();
      setupZoomOut();
      setStatus({
        lightbox: Status.Lightbox.CLOSING,
        image: status.image,
      });
    }
  }, [status.lightbox]);

  useEffect(() => {
    if (status.lightbox === Status.Lightbox.CLOSED) {
      ui.setActiveLightboxImgPos(undefined);
    }
  }, [status.lightbox]);

  const rememberImagePosition = () => {
    if (imgRef.current) {
      const lightboxImageEl = imgRef.current;
      const lightboxImgDOMRect = lightboxImageEl.getBoundingClientRect();
      const {
        top: lightboxImgTop,
        left: lightboxImgLeft,
        width: lightboxImgWidth,
        height: lightboxImgHeight,
      } = lightboxImgDOMRect;
      finalImagePosition.current = {
        center: {
          x: lightboxImgLeft + lightboxImgWidth / 2,
          y: lightboxImgTop + lightboxImgHeight / 2,
        },
        width: lightboxImgWidth,
        height: lightboxImgHeight,
      };
    }
  };

  const setupZoomIn = () => {
    if (imgRef.current) {
      // in editor
      const imgSrc = imgRef.current.src;
      const imgUrlObj = new URL(imgSrc);
      const imgPath = imgUrlObj.pathname.concat(imgUrlObj.search);
      const editorImageEl = view.dom.querySelector(`img[src="${imgPath}"]`)!;
      const editorImgDOMRect = editorImageEl.getBoundingClientRect();
      const {
        top: editorImgTop,
        left: editorImgLeft,
        width: editorImgWidth,
        height: editorImgHeight,
      } = editorImgDOMRect;

      const from = {
        center: {
          x: editorImgLeft + editorImgWidth / 2,
          y: editorImgTop + editorImgHeight / 2,
        },
        width: editorImgWidth,
        height: editorImgHeight,
      };

      // in lightbox
      const lightboxImageEl = imgRef.current;
      const lightboxImgDOMRect = lightboxImageEl.getBoundingClientRect();
      const {
        top: lightboxImgTop,
        left: lightboxImgLeft,
        width: lightboxImgWidth,
        height: lightboxImgHeight,
      } = lightboxImgDOMRect;
      const to = {
        center: {
          x: lightboxImgLeft + lightboxImgWidth / 2,
          y: lightboxImgTop + lightboxImgHeight / 2,
        },
        width: lightboxImgWidth,
        height: lightboxImgHeight,
      };

      const zoomIn = () => {
        const tx = from.center.x - to.center.x;
        const ty = from.center.y - to.center.y;
        return keyframes`
            from {
              translate: ${tx}px ${ty}px;
              scale: ${from.width / to.width};
            }
            to {
              translate: 0;
              scale: 1;
            }
        `;
      };
      animation.current = {
        ...(animation.current ?? {}),
        zoomOut: undefined,
        zoomIn: { apply: zoomIn, duration: ANIMATION_DURATION },
      };
    }
  };

  const setupFadeIn = () => {
    const fadeIn = () => keyframes`
                    from { opacity: 0; }
                    to { opacity: 1; }
                    `;
    animation.current = {
      ...(animation.current ?? {}),
      fadeIn: { apply: fadeIn, duration: ANIMATION_DURATION },
      fadeOut: undefined,
    };
  };

  const setupFadeOut = () => {
    const fadeOut = () => keyframes`
              from { opacity: ${window.getComputedStyle(overlayRef.current!).opacity}; }
              to { opacity: 0; }
              `;
    animation.current = {
      ...(animation.current ?? {}),
      fadeIn: undefined,
      fadeOut: {
        apply: fadeOut,
        duration: animation.current!.startTime
          ? Date.now() - animation.current!.startTime!
          : ANIMATION_DURATION,
      },
    };
  };

  const setupZoomOut = () => {
    if (imgRef.current) {
      // in lightbox
      const lightboxImageEl = imgRef.current;
      const lightboxImgDOMRect = lightboxImageEl.getBoundingClientRect();
      const {
        top: lightboxImgTop,
        left: lightboxImgLeft,
        width: lightboxImgWidth,
        height: lightboxImgHeight,
      } = lightboxImgDOMRect;
      const from = {
        center: {
          x: lightboxImgLeft + lightboxImgWidth / 2,
          y: lightboxImgTop + lightboxImgHeight / 2,
        },
        width: lightboxImgWidth,
        height: lightboxImgHeight,
      };

      // in editor
      const imgSrc = imgRef.current.src;
      const imgUrlObj = new URL(imgSrc);
      const imgPath = imgUrlObj.pathname.concat(imgUrlObj.search);
      const editorImageEl = view.dom.querySelector(`img[src="${imgPath}"]`);
      let to;
      if (editorImageEl) {
        const editorImgDOMRect = editorImageEl.getBoundingClientRect();
        const {
          top: editorImgTop,
          left: editorImgLeft,
          width: editorImgWidth,
          height: editorImgHeight,
        } = editorImgDOMRect;

        to = {
          center: {
            x: editorImgLeft + editorImgWidth / 2,
            y:
              editorImgTop + editorImgHeight / 2 >
              window.innerHeight + editorImgHeight / 2
                ? window.innerHeight + editorImgHeight / 2
                : editorImgTop + editorImgHeight / 2 < -editorImgHeight / 2
                  ? -editorImgHeight / 2
                  : editorImgTop + editorImgHeight / 2,
          },
          width: editorImgWidth,
          height: editorImgHeight,
        };
      } else {
        to = {
          center: {
            x: from.center.x,
            y: window.innerHeight + lightboxImgHeight / 2,
          },
          width: lightboxImgWidth,
          height: lightboxImgHeight,
        };
      }

      const zoomOut = () => {
        const final = finalImagePosition.current!;
        const fromTx = from.center.x - final.center.x;
        const fromTy = from.center.y - final.center.y;
        const toTx = to.center.x - final.center.x;
        const toTy = to.center.y - final.center.y;

        const fromSx = from.width / final.width;
        const fromSy = from.height / final.height;
        const toSx = to.width / final.width;
        const toSy = to.height / final.height;
        return keyframes`
            from {
              translate: ${fromTx}px ${fromTy}px;
              scale: ${fromSx} ${fromSy};
            }
            to {
              translate: ${toTx}px ${toTy}px;
              scale: ${toSx} ${toSy};
            }
        `;
      };
      animation.current = {
        ...(animation.current ?? {}),
        zoomIn: undefined,
        zoomOut: {
          apply: zoomOut,
          duration: animation.current!.startTime
            ? Date.now() - animation.current!.startTime!
            : ANIMATION_DURATION,
        },
      };
    }
  };

  if (!activeLightboxImgPos) {
    return null;
  }
  const imageNodes = useMemo(
    () =>
      findChildren(
        view.state.doc,
        (child) => child.type === view.state.schema.nodes.image,
        true
      ),
    []
  );
  const currNodeIndex = findIndex(
    imageNodes,
    (node) => node.pos === activeLightboxImgPos
  );
  const currImgNode = imageNodes[currNodeIndex].node;

  const prev = () => {
    if (status.lightbox === Status.Lightbox.OPENED) {
      if (!activeLightboxImgPos) {
        return;
      }
      const currentIndex = findIndex(
        imageNodes,
        (node) => node.pos === activeLightboxImgPos
      );
      const prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        return;
      }
      const prevImgPos = imageNodes[prevIndex].pos;
      ui.setActiveLightboxImgPos(prevImgPos);
    }
  };

  const next = () => {
    if (status.lightbox === Status.Lightbox.OPENED) {
      if (!activeLightboxImgPos) {
        return;
      }
      const currentIndex = findIndex(
        imageNodes,
        (node) => node.pos === activeLightboxImgPos
      );
      const nextIndex = currentIndex + 1;
      if (nextIndex >= imageNodes.length) {
        return;
      }
      const nextImgPos = imageNodes[nextIndex].pos;
      ui.setActiveLightboxImgPos(nextImgPos);
    }
  };

  const close = () => {
    if (
      status.lightbox === Status.Lightbox.OPENING ||
      status.lightbox === Status.Lightbox.OPENED
    ) {
      setStatus({
        lightbox: Status.Lightbox.READY_TO_CLOSE,
        image: status.image,
      });
    }
  };

  const download = () => {
    if (status.lightbox === Status.Lightbox.OPENED) {
      void downloadImageNode(currImgNode);
    }
  };

  const handleKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    ev.preventDefault();
    switch (ev.key) {
      case "ArrowLeft": {
        prev();
        break;
      }
      case "ArrowRight": {
        next();
        break;
      }
      case "Escape": {
        close();
        break;
      }
    }
  };

  const handleFadeStart = () => {
    if (animation.current?.fadeIn) {
      animation.current = {
        ...(animation.current ?? {}),
        startTime: Date.now(),
      };
    }
  };

  const handleFadeEnd = () => {
    if (animation.current?.fadeIn) {
      animation.current = {
        ...(animation.current ?? {}),
        startTime: undefined,
      };
      setStatus({
        lightbox: Status.Lightbox.OPENED,
        image: status.image,
      });
    } else if (animation.current?.fadeOut) {
      setStatus({
        lightbox: Status.Lightbox.CLOSED,
        image: null,
      });
    }
  };

  return (
    <Dialog.Root open={!!activeLightboxImgPos}>
      <Dialog.Portal>
        <StyledOverlay
          ref={overlayRef}
          animation={animation.current}
          onAnimationStart={handleFadeStart}
          onAnimationEnd={handleFadeEnd}
        />
        <StyledContent onKeyDown={handleKeyDown}>
          <VisuallyHidden.Root>
            <Dialog.Title>{t("Lightbox")}</Dialog.Title>
            <Dialog.Description>
              {t("View, navigate or download images contained in the doc")}
            </Dialog.Description>
          </VisuallyHidden.Root>
          <Actions animation={animation.current}>
            <Tooltip content={t("Download")} placement="bottom">
              <StyledActionButton tabIndex={-1} onClick={download} size={32}>
                <DownloadIcon size={32} />
              </StyledActionButton>
            </Tooltip>
            <Dialog.Close asChild>
              <Tooltip content={t("Close")} shortcut="Esc" placement="bottom">
                <StyledActionButton tabIndex={-1} onClick={close} size={32}>
                  <CloseIcon size={32} />
                </StyledActionButton>
              </Tooltip>
            </Dialog.Close>
          </Actions>
          {currNodeIndex > 0 && (
            <Nav dir="left" $hidden={isIdle} animation={animation.current}>
              <StyledNavButton onClick={prev} size={32}>
                <BackIcon size={32} />
              </StyledNavButton>
            </Nav>
          )}
          <Image
            ref={imgRef}
            src={sanitizeUrl(currImgNode.attrs.src) ?? ""}
            alt={currImgNode.attrs.alt ?? ""}
            onLoading={() =>
              setStatus({
                lightbox: status.lightbox,
                image: Status.Image.LOADING,
              })
            }
            onLoad={() =>
              setStatus({
                lightbox: status.lightbox,
                image: Status.Image.LOADED,
              })
            }
            onError={() =>
              setStatus({
                lightbox: status.lightbox,
                image: Status.Image.ERROR,
              })
            }
            onSwipeRight={next}
            onSwipeLeft={prev}
            onSwipeDown={close}
            status={status}
            animation={animation.current}
          />
          {currNodeIndex < imageNodes.length - 1 && (
            <Nav dir="right" $hidden={isIdle} animation={animation.current}>
              <StyledNavButton onClick={next} size={32}>
                <NextIcon size={32} />
              </StyledNavButton>
            </Nav>
          )}
        </StyledContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type Props = {
  src: string;
  alt: string;
  onLoading: () => void;
  onLoad: () => void;
  onError: () => void;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeDown: () => void;
  status: { lightbox: Status.Lightbox | null; image: Status.Image | null };
  animation: {
    zoomIn?: { apply: () => Keyframes; duration: number };
    zoomOut?: { apply: () => Keyframes; duration: number };
    fadeIn?: { apply: () => Keyframes; duration: number };
    fadeOut?: { apply: () => Keyframes; duration: number };
  } | null;
};

const Image = forwardRef<HTMLImageElement, Props>(function _Image(
  {
    src,
    alt,
    onLoading,
    onLoad,
    onError,
    onSwipeRight,
    onSwipeLeft,
    onSwipeDown,
    status,
    animation,
  }: Props,
  ref
) {
  let touchXStart: number | undefined;
  let touchXEnd: number | undefined;
  let touchYStart: number | undefined;
  let touchYEnd: number | undefined;

  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    touchXStart = e.changedTouches[0].screenX;
    touchYStart = e.changedTouches[0].screenY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    touchXEnd = e.changedTouches[0].screenX as number;
    touchYEnd = e.changedTouches[0].screenY as number;
    const dx = touchXEnd - (touchXStart as number);
    const dy = touchYEnd - (touchYStart as number);
    const theta = Math.abs(dy) / Math.abs(dx);

    const swipeRight = dx > 0 && theta < 1;
    if (swipeRight) {
      return onSwipeRight();
    }

    const swipeLeft = dx < 0 && theta < 1;
    if (swipeLeft) {
      return onSwipeLeft();
    }

    const swipeDown = dy > 0 && theta > 1;
    if (swipeDown) {
      return onSwipeDown();
    }
  };

  const handleTouchEnd = () => {
    touchXStart = undefined;
    touchXEnd = undefined;
    touchYStart = undefined;
    touchYEnd = undefined;
  };

  const handleTouchCancel = () => {
    touchXStart = undefined;
    touchXEnd = undefined;
    touchYStart = undefined;
    touchYEnd = undefined;
  };

  const [hidden, setHidden] = useState(
    status.image === null || status.image === Status.Image.LOADING
  );

  useEffect(() => {
    onLoading();
  }, [src]);

  useEffect(() => {
    if (status.image === null || status.image === Status.Image.LOADING) {
      setHidden(true);
    } else if (status.image === Status.Image.LOADED) {
      setHidden(false);
    }
  }, [status.image]);

  return status.image === Status.Image.ERROR ? (
    <StyledError animation={animation}>
      <CrossIcon size={16} /> Image failed to load
    </StyledError>
  ) : (
    <>
      {status.image === Status.Image.LOADING && <LoadingIndicator />}
      <Figure>
        <StyledImg
          ref={ref}
          src={src}
          alt={alt}
          animation={animation}
          onAnimationStart={() => setHidden(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onError={onError}
          onLoad={onLoad}
          $hidden={hidden}
        />
        <Caption>
          {status.image === Status.Image.LOADED &&
          status.lightbox === Status.Lightbox.OPENED
            ? alt
            : ""}
        </Caption>
      </Figure>
    </>
  );
});

const Figure = styled("figure")`
  width: 100%;
  height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Caption = styled("figcaption")`
  font-size: 14px;
  min-height: 1.5em;
  font-weight: normal;
  color: ${s("textSecondary")};
  flex-shrink: 0;
`;

const StyledOverlay = styled(Dialog.Overlay)<{
  animation: {
    fadeIn?: { apply: () => Keyframes; duration: number };
    fadeOut?: { apply: () => Keyframes; duration: number };
  } | null;
}>`
  position: fixed;
  inset: 0;
  background-color: ${s("background")};
  z-index: ${depths.overlay};
  ${(props) =>
    props.animation === null
      ? css`
          opacity: 0;
        `
      : props.animation.fadeIn
        ? css`
            animation: ${props.animation.fadeIn.apply()}
              ${props.animation.fadeIn.duration}ms;
          `
        : props.animation.fadeOut
          ? css`
              animation: ${props.animation.fadeOut.apply()}
                ${props.animation.fadeOut.duration}ms;
            `
          : ""}
`;

const StyledImg = styled.img<{
  $hidden: boolean;
  animation: {
    zoomIn?: { apply: () => Keyframes; duration: number };
    zoomOut?: { apply: () => Keyframes; duration: number };
  } | null;
}>`
  visibility: ${(props) => (props.$hidden ? "hidden" : "visible")};
  max-width: 100%;
  min-height: 0;
  object-fit: contain;
  ${(props) =>
    props.animation?.zoomIn
      ? css`
          animation: ${props.animation.zoomIn.apply()}
            ${props.animation.zoomIn.duration}ms;
        `
      : props.animation?.zoomOut
        ? css`
            animation: ${props.animation.zoomOut.apply()}
              ${props.animation.zoomOut.duration}ms;
          `
        : ""}
`;

const StyledContent = styled(Dialog.Content)`
  position: fixed;
  inset: 0;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: center;
  outline: none;
  padding: 56px;
`;

const Actions = styled.div<{
  animation: {
    fadeIn?: { apply: () => Keyframes; duration: number };
    fadeOut?: { apply: () => Keyframes; duration: number };
  } | null;
}>`
  position: absolute;
  top: 0;
  right: 0;
  margin: 12px;
  display: flex;
  ${(props) =>
    props.animation === null
      ? css`
          opacity: 0;
        `
      : props.animation.fadeIn
        ? css`
            animation: ${props.animation.fadeIn.apply()}
              ${props.animation.fadeIn.duration}ms;
          `
        : props.animation.fadeOut
          ? css`
              animation: ${props.animation.fadeOut.apply()}
                ${props.animation.fadeOut.duration}ms;
            `
          : ""}
`;

const StyledActionButton = styled(NudeButton)`
  opacity: 0.75;
  color: ${s("text")};
  outline: none;

  &:is(:first-child) {
    margin-right: 6px;
    margin-left: 0;
  }

  &:is(:last-child) {
    margin-right: 0;
    margin-left: 6px;
  }

  &:hover {
    opacity: 1;
  }
`;

const Nav = styled.div<{
  $hidden: boolean;
  dir: "left" | "right";
  animation: {
    fadeIn?: { apply: () => Keyframes; duration: number };
    fadeOut?: { apply: () => Keyframes; duration: number };
  } | null;
}>`
  position: absolute;
  ${(props) => (props.dir === "left" ? "left: 0;" : "right: 0;")}
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}
  ${(props) =>
    props.animation === null
      ? css`
          opacity: 0;
        `
      : props.animation.fadeIn
        ? css`
            animation: ${props.animation.fadeIn.apply()}
              ${props.animation.fadeIn.duration}ms;
          `
        : props.animation.fadeOut
          ? css`
              animation: ${props.animation.fadeOut.apply()}
                ${props.animation.fadeOut.duration}ms;
            `
          : ""}
`;

const StyledError = styled(Error)<{
  animation: {
    fadeIn?: { apply: () => Keyframes; duration: number };
    fadeOut?: { apply: () => Keyframes; duration: number };
  } | null;
}>`
  ${(props) =>
    props.animation === null
      ? css`
          opacity: 0;
        `
      : props.animation.fadeIn
        ? css`
            animation: ${props.animation.fadeIn.apply()}
              ${props.animation.fadeIn.duration}ms;
          `
        : props.animation.fadeOut
          ? css`
              animation: ${props.animation.fadeOut.apply()}
                ${props.animation.fadeOut.duration}ms;
            `
          : ""}
`;

const StyledNavButton = styled(NudeButton)`
  margin: 12px;
  opacity: 0.75;
  color: ${s("text")};
  outline: none;

  &:hover {
    opacity: 1;
  }
`;

export default observer(Lightbox);
