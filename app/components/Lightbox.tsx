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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sanitizeUrl } from "@shared/utils/urls";
import { Node } from "prosemirror-model";
import { Error } from "@shared/editor/components/Image";
import { BackIcon, CloseIcon, CrossIcon, NextIcon } from "outline-icons";
import { depths, s } from "@shared/styles";
import NudeButton from "./NudeButton";

function Lightbox() {
  const { view } = useEditor();
  const { ui } = useStores();
  const { activeLightboxImgPos } = ui;
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
  return (
    <Dialog.Root open={!!activeLightboxImgPos}>
      <Dialog.Portal>
        <StyledOverlay />
        <StyledContent>
          <Dialog.Close asChild>
            <Close onClick={() => ui.setActiveLightboxImgPos(undefined)}>
              <CloseIcon size={32} />
            </Close>
          </Dialog.Close>
          {activeLightboxImgPos ? (
            <>
              <Actions>
                <StyledActionButton onClick={() => prev()}>
                  <BackIcon size={32} />
                </StyledActionButton>
                <StyledActionButton onClick={() => next()}>
                  <NextIcon size={32} />
                </StyledActionButton>
              </Actions>
              <div className="lightbox-content">
                <Image node={currImgNode} />
              </div>
            </>
          ) : null}
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
};

const Image = (props: Props) => {
  const { node } = props;
  const [status, setStatus] = useState<Status | null>(null);

  const [imgWidth, setImgWidth] = useState(node.attrs.width);
  const [imgHeight, setImgHeight] = useState(node.attrs.height);

  const errContainerWidth = useMemo(() => imgWidth, [imgWidth]);
  const errContainerHeight = useMemo(() => imgHeight, [imgHeight]);

  return status === Status.ERROR ? (
    <Error style={{ width: errContainerWidth, height: errContainerHeight }}>
      <CrossIcon size={16} /> Image failed to load
    </Error>
  ) : (
    <img
      src={sanitizeUrl(node.attrs.src)}
      alt={node.attrs.alt || ""}
      width={imgWidth}
      height={imgHeight}
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
      }}
    />
  );
};

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
`;

const Close = styled(NudeButton)`
  position: absolute;
  top: 0;
  right: 0;
  margin: 12px;
  opacity: 0.75;
  color: ${s("text")};

  &:hover {
    opacity: 1;
  }
`;

const Actions = styled.div`
  position: absolute;
  bottom: 12px;
`;

const StyledActionButton = styled(NudeButton)`
  margin: 12px;
  opacity: 0.75;
  color: ${s("text")};

  &:hover {
    opacity: 1;
  }
`;

export default observer(Lightbox);
