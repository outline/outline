import { useEditor } from "~/editor/components/EditorContext";
import breakpoint from "styled-components-breakpoint";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import * as Dialog from "@radix-ui/react-dialog";
import { findChildren } from "@shared/editor/queries/findChildren";
import { filter, findIndex, isNil, map, uniq } from "lodash";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import styled from "styled-components";
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
import { fadeIn } from "~/styles/animations";
import useIdle from "~/hooks/useIdle";
import { Second } from "@shared/utils/time";
import { downloadImageNode } from "@shared/editor/nodes/Image";

function Lightbox() {
  const { view } = useEditor();
  const { ui } = useStores();
  const isIdle = useIdle(3 * Second.ms);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { activeLightboxImgPos } = ui;
  const isOpen = !!activeLightboxImgPos;
  const prevActiveLightboxImgPos = usePrevious(activeLightboxImgPos);
  const wasOpen = !!prevActiveLightboxImgPos;
  const shouldAnimate = isOpen && !wasOpen;

  const animate = useCallback(() => {
    if (shouldAnimate && imgRef.current) {
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
        };
      });
    }
  }, [shouldAnimate, imgRef.current]);
  if (!activeLightboxImgPos) {
    return null;
  }
  const imageNodes = findChildren(
    view.state.doc,
    (child) => child.type === view.state.schema.nodes.image,
    true
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
  const close = () => {
    ui.setActiveLightboxImgPos(undefined);
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
        <StyledOverlay />
        <StyledContent onKeyDown={handleKeyDown}>
          <Actions>
            <StyledActionButton onClick={download} size={32}>
              <DownloadIcon size={32} />
            </StyledActionButton>
            <Dialog.Close asChild>
              <StyledActionButton onClick={close} size={32}>
                <CloseIcon size={32} />
              </StyledActionButton>
            </Dialog.Close>
          </Actions>
          <Nav dir="left" $hidden={isIdle}>
            <StyledNavButton onClick={prev} size={32}>
              <BackIcon size={32} />
            </StyledNavButton>
          </Nav>
          <Image
            ref={imgRef}
            node={currImgNode}
            onLoad={animate}
            onSwipeRight={next}
            onSwipeLeft={prev}
            onSwipeDown={close}
          />
          <Nav dir="right" $hidden={isIdle}>
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
  node: Node;
  onLoad: () => void;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeDown: () => void;
};

const Image = forwardRef<HTMLImageElement, Props>(function _Image(
  props: Props,
  ref
) {
  const { node } = props;
  const [status, setStatus] = useState<Status | null>(null);

  const [imgWidth, setImgWidth] = useState(node.attrs.width);
  const [imgHeight, setImgHeight] = useState(node.attrs.height);

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
      return props.onSwipeRight();
    }

    const swipeLeft = dx < 0 && theta < 1;
    if (swipeLeft) {
      return props.onSwipeLeft();
    }

    const swipeDown = dy > 0 && theta > 1;
    if (swipeDown) {
      return props.onSwipeDown();
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
    <Figure style={{ width: imgWidth, height: imgHeight }}>
      <img
        ref={ref}
        src={sanitizeUrl(node.attrs.src)}
        style={{
          visibility: "hidden",
          maxHeight: "100%",
          maxWidth: "100%",
          objectFit: "scale-down",
        }}
        alt={node.attrs.alt || ""}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onError={() => {
          setStatus(Status.ERROR);
        }}
        onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
          // For some SVG's Firefox does not provide the naturalWidth, in this
          // rare case we need to provide a default so that the image can be
          // seen and is not sized to 0px
          const width =
            node.attrs.width ||
            (ev.target as HTMLImageElement).naturalWidth ||
            300;
          setImgWidth(width);
          const height =
            node.attrs.height || (ev.target as HTMLImageElement).naturalHeight;
          setImgHeight(height);
          setStatus(Status.LOADED);
          props.onLoad();
        }}
      />
      <Caption>{node.attrs.alt || ""}</Caption>
    </Figure>
  );
});

const Figure = styled("figure")`
  max-width: 100%;
  max-height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Caption = styled("figcaption")`
  font-size: 14px;
  font-weight: normal;
  color: ${s("textSecondary")};
`;

const StyledOverlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  background-color: ${s("background")};
  z-index: ${depths.overlay};
  animation: ${fadeIn} 0.3s;
`;

const StyledContent = styled(Dialog.Content)`
  position: fixed;
  inset: 0;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: center;
  outline: none;
  padding: 0 56px;
`;

const Actions = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  margin: 12px;
  display: flex;
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

const Nav = styled.div<{ $hidden: boolean; dir: "left" | "right" }>`
  position: absolute;
  ${(props) => (props.dir === "left" ? "left: 0;" : "right: 0;")}
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}
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
