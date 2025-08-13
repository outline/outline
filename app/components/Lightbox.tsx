import { useEditor } from "~/editor/components/EditorContext";
import breakpoint from "styled-components-breakpoint";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import * as Dialog from "@radix-ui/react-dialog";
import { findChildren } from "@shared/editor/queries/findChildren";
import { filter, findIndex, isNil, map, uniq } from "lodash";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import styled, { css } from "styled-components";
import useDragResize from "@shared/editor/components/hooks/useDragResize";
import { ComponentProps } from "@shared/editor/types";
import { EditorView } from "prosemirror-view";
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { sanitizeUrl } from "@shared/utils/urls";
import { Node } from "prosemirror-model";
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
import usePrevious from "~/hooks/usePrevious";
import { fadeIn, fadeOut } from "~/styles/animations";
import useIdle from "~/hooks/useIdle";
import { Second } from "@shared/utils/time";
import { downloadImageNode } from "@shared/editor/nodes/Image";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useTranslation } from "react-i18next";
enum LightboxStatus {
  CLOSED,
  OPENED,
  CLOSING,
}
function Lightbox() {
  const { view } = useEditor();
  const { ui } = useStores();
  const isIdle = useIdle(3 * Second.ms);
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { activeLightboxImgPos } = ui;
  const isOpen = !!activeLightboxImgPos;
  const prevActiveLightboxImgPos = usePrevious(activeLightboxImgPos);
  const wasOpen = !!prevActiveLightboxImgPos;
  const shouldAnimate = isOpen && !wasOpen;
  const [lightboxStatus, setLightboxStatus] = useState<LightboxStatus>(
    LightboxStatus.CLOSED
  );

  const animate = useCallback(() => {
    if (imgRef.current) {
      if (shouldAnimate) {
        const dom = view.nodeDOM(activeLightboxImgPos) as HTMLElement;
        // in editor
        const editorImageEl = dom.querySelector("img") as HTMLImageElement;
        const editorImgDOMRect = editorImageEl.getBoundingClientRect();
        const {
          top: editorImgTop,
          left: editorImgLeft,
          width: editorImgWidth,
          height: editorImgHeight,
        } = editorImgDOMRect;

        // in lightbox
        const lightboxImageEl = imgRef.current;
        const lightboxImgDOMRect = lightboxImageEl.getBoundingClientRect();
        const {
          top: lightboxImgTop,
          left: lightboxImgLeft,
          width: lightboxImgWidth,
          height: lightboxImgHeight,
        } = lightboxImgDOMRect;

        lightboxImageEl.style.position = "fixed";
        lightboxImageEl.style.top = `${editorImgTop}px`;
        lightboxImageEl.style.left = `${editorImgLeft}px`;
        lightboxImageEl.style.width = `${editorImgWidth}px`;
        lightboxImageEl.style.height = `${editorImgHeight}px`;

        requestAnimationFrame(() => {
          const tx = lightboxImgLeft - editorImgLeft;
          const ty = lightboxImgTop - editorImgTop;
          lightboxImageEl.style.transition =
            "transform 300ms, width 300ms, height 300ms";
          lightboxImageEl.style.transform = `translate(${tx}px, ${ty}px)`;

          lightboxImageEl.ontransitionstart = () => {
            lightboxImageEl.style.width = `${lightboxImgWidth}px`;
            lightboxImageEl.style.height = `${lightboxImgHeight}px`;
            lightboxImageEl.style.visibility = "visible";
          };

          lightboxImageEl.ontransitionend = () => {
            lightboxImageEl.style.position = "";
            lightboxImageEl.style.top = "";
            lightboxImageEl.style.left = "";
            lightboxImageEl.style.width = "";
            lightboxImageEl.style.height = "";
            lightboxImageEl.style.transform = "";
            lightboxImageEl.style.transition = "";
            setLightboxStatus(LightboxStatus.OPENED);
          };
        });
      } else {
        // If not animating, force image to be visible, since
        // all images start as hidden
        imgRef.current.style.visibility = "visible";
      }
    }
  }, [shouldAnimate, imgRef.current]);
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
  const currImgPos = imageNodes[currNodeIndex].pos;

  const prev = () => {
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
  };
  const next = () => {
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
  };

  const animateOnClose = () => {
    if (imgRef.current) {
      const dom = view.nodeDOM(activeLightboxImgPos);
      if (
        !dom ||
        !(dom instanceof HTMLSpanElement) ||
        !dom.classList.contains("component-image")
      ) {
        ui.setActiveLightboxImgPos(undefined);
        return;
      }
      // in editor
      const editorImageEl = dom.querySelector("img") as HTMLImageElement;
      const editorImgDOMRect = editorImageEl.getBoundingClientRect();
      const {
        top: editorImgTop,
        left: editorImgLeft,
        width: editorImgWidth,
        height: editorImgHeight,
      } = editorImgDOMRect;

      // in lightbox
      const lightboxImageEl = imgRef.current;
      const lightboxImgDOMRect = lightboxImageEl.getBoundingClientRect();
      const {
        top: lightboxImgTop,
        left: lightboxImgLeft,
        width: lightboxImgWidth,
        height: lightboxImgHeight,
      } = lightboxImgDOMRect;

      lightboxImageEl.style.width = `${lightboxImgWidth}px`;
      lightboxImageEl.style.height = `${lightboxImgHeight}px`;

      requestAnimationFrame(() => {
        const toX = editorImgLeft + editorImgWidth / 2;
        const toY = editorImgTop + editorImgHeight / 2;
        const fromX = lightboxImgLeft + lightboxImgWidth / 2;
        const fromY = lightboxImgTop + lightboxImgHeight / 2;
        const tx = toX - fromX;
        const ty = toY - fromY;
        lightboxImageEl.style.transition =
          "width 300ms, height 300ms, transform 300ms";
        lightboxImageEl.style.transform = `translate(${tx}px, ${ty}px)`;

        lightboxImageEl.ontransitionstart = () => {
          setLightboxStatus(LightboxStatus.CLOSING);
          lightboxImageEl.style.width = `${editorImgWidth}px`;
          lightboxImageEl.style.height = `${editorImgHeight}px`;
        };

        lightboxImageEl.ontransitionend = () => {
          setLightboxStatus(LightboxStatus.CLOSED);
          ui.setActiveLightboxImgPos(undefined);
        };
      });
    }
  };
  const close = () => {
    animateOnClose();
  };
  const download = () => {
    void downloadImageNode(currImgNode);
  };
  const handleKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
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

  return (
    <Dialog.Root open={!!activeLightboxImgPos}>
      <Dialog.Portal>
        <StyledOverlay $lightboxStatus={lightboxStatus} />
        <StyledContent onKeyDown={handleKeyDown}>
          <VisuallyHidden.Root>
            <Dialog.Title>{t("Lightbox")}</Dialog.Title>
          </VisuallyHidden.Root>
          <Actions $lightboxStatus={lightboxStatus}>
            <StyledActionButton onClick={download} size={32}>
              <DownloadIcon size={32} />
            </StyledActionButton>
            <Dialog.Close asChild>
              <StyledActionButton onClick={close} size={32}>
                <CloseIcon size={32} />
              </StyledActionButton>
            </Dialog.Close>
          </Actions>
          <Nav dir="left" $hidden={isIdle} $lightboxStatus={lightboxStatus}>
            <StyledNavButton onClick={prev} size={32}>
              <BackIcon size={32} />
            </StyledNavButton>
          </Nav>
          <Image
            ref={imgRef}
            src={sanitizeUrl(currImgNode.attrs.src) ?? ""}
            alt={currImgNode.attrs.alt ?? ""}
            onLoad={animate}
            onSwipeRight={next}
            onSwipeLeft={prev}
            onSwipeDown={close}
            lightboxStatus={lightboxStatus}
          />
          <Nav dir="right" $hidden={isIdle} $lightboxStatus={lightboxStatus}>
            <StyledNavButton onClick={next} size={32}>
              <NextIcon size={32} />
            </StyledNavButton>
          </Nav>
        </StyledContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

enum Status {
  ERROR,
  LOADED,
}

type Props = {
  src: string;
  alt: string;
  onLoad: () => void;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeDown: () => void;
  lightboxStatus: LightboxStatus;
};

const Image = forwardRef<HTMLImageElement, Props>(function _Image(
  {
    src,
    alt,
    onLoad,
    onSwipeRight,
    onSwipeLeft,
    onSwipeDown,
    lightboxStatus,
  }: Props,
  ref
) {
  const [status, setStatus] = useState<Status | null>(null);

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

  return status === Status.ERROR ? (
    <Error>
      <CrossIcon size={16} /> Image failed to load
    </Error>
  ) : (
    <Figure>
      <img
        ref={ref}
        src={src}
        style={{
          // Images start being hidden so that there's no flash of image
          // just as the animation starts
          visibility: "hidden",
          maxHeight: "100%",
          maxWidth: "100%",
          minHeight: 0,
          objectFit: "scale-down",
        }}
        alt={alt}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onError={() => {
          setStatus(Status.ERROR);
        }}
        onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
          setStatus(Status.LOADED);
          onLoad();
        }}
      />
      <Caption>
        {status === Status.LOADED && lightboxStatus === LightboxStatus.OPENED
          ? alt
          : ""}
      </Caption>
    </Figure>
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
  $lightboxStatus: LightboxStatus;
}>`
  position: fixed;
  inset: 0;
  background-color: ${s("background")};
  z-index: ${depths.overlay};
  ${(props) =>
    props.$lightboxStatus === LightboxStatus.CLOSED
      ? css`
          animation: ${fadeIn} 0.3s;
        `
      : props.$lightboxStatus === LightboxStatus.OPENED
        ? css`
            animation: none;
          `
        : css`
            animation: ${fadeOut} 0.3s;
          `}
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
  $lightboxStatus: LightboxStatus;
}>`
  position: absolute;
  top: 0;
  right: 0;
  margin: 12px;
  display: flex;
  ${(props) =>
    props.$lightboxStatus === LightboxStatus.CLOSED
      ? css`
          animation: ${fadeIn} 0.3s;
        `
      : props.$lightboxStatus === LightboxStatus.OPENED
        ? css`
            animation: none;
          `
        : css`
            animation: ${fadeOut} 0.3s;
          `}
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
  $lightboxStatus: LightboxStatus;
}>`
  position: absolute;
  ${(props) => (props.dir === "left" ? "left: 0;" : "right: 0;")}
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}
  ${(props) =>
    props.$lightboxStatus === LightboxStatus.CLOSED
      ? css`
          animation: ${fadeIn} 0.3s;
        `
      : props.$lightboxStatus === LightboxStatus.OPENED
        ? css`
            animation: none;
          `
        : css`
            animation: ${fadeOut} 0.3s;
          `}
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
