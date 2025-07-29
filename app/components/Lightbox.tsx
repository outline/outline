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
import { BackIcon, CloseIcon, CrossIcon, NextIcon } from "outline-icons";
import { depths, s } from "@shared/styles";
import NudeButton from "./NudeButton";
import usePrevious from "~/hooks/usePrevious";

function Lightbox() {
  const { view } = useEditor();
  const { ui } = useStores();
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
        lightboxImageEl.style.width = `${lightboxImgWidth}px`;
        lightboxImageEl.style.height = `${lightboxImgHeight}px`;
        lightboxImageEl.style.visibility = "visible";
        lightboxImageEl.style.transform = `translate(${tx}px, ${ty}px)`;
        lightboxImageEl.style.transition =
          "transform 300ms, width 300ms, height 300ms";
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
    if (nextIndex > imageNodes.length) {
      return;
    }
    const nextImgPos = imageNodes[nextIndex].pos;
    ui.setActiveLightboxImgPos(nextImgPos);
  };
  const close = () => {
    ui.setActiveLightboxImgPos(undefined);
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
          <Dialog.Close asChild>
            <Close onClick={close}>
              <CloseIcon size={32} />
            </Close>
          </Dialog.Close>
          <Image ref={imgRef} node={currImgNode} onLoad={animate} />
          <Nav>
            <StyledActionButton onClick={prev}>
              <BackIcon size={32} />
            </StyledActionButton>
            <StyledActionButton onClick={next}>
              <NextIcon size={32} />
            </StyledActionButton>
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
};

const Image = forwardRef<HTMLImageElement, Props>(function _Image(
  props: Props,
  ref
) {
  const { node } = props;
  const [status, setStatus] = useState<Status | null>(null);

  const [imgWidth, setImgWidth] = useState(node.attrs.width);
  const [imgHeight, setImgHeight] = useState(node.attrs.height);

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
  background-color: ${(props) => props.theme.modalBackground};
  z-index: ${depths.overlay};
`;

const StyledContent = styled(Dialog.Content)`
  position: fixed;
  inset: 0;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: center;
  outline: none;
  padding: 0 44px;
`;

const Close = styled(NudeButton)`
  position: absolute;
  top: 0;
  right: 0;
  margin: 12px;
  opacity: 0.75;
  color: ${s("text")};
  outline: none;

  &:hover {
    opacity: 1;
  }
`;

const Nav = styled.div`
  position: absolute;
  bottom: 12px;
`;

const StyledActionButton = styled(NudeButton)`
  margin: 12px;
  opacity: 0.75;
  color: ${s("text")};
  outline: none;

  &:hover {
    opacity: 1;
  }
`;

export default observer(Lightbox);
