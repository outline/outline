import { useEditor } from "~/editor/components/EditorContext";
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
import { CrossIcon } from "outline-icons";

function Lightbox() {
  const { view } = useEditor();
  const { lightbox } = useStores();
  const { currentItem } = lightbox;
  if (!currentItem) {
    return null;
  }
  const imageNodes = findChildren(
    view.state.doc,
    (child) => child.type === view.state.schema.nodes.image,
    true
  );
  const currNodeIndex = findIndex(
    imageNodes,
    (node) => node.pos === currentItem
  );
  const currImgNode = imageNodes[currNodeIndex].node;
  const currImgPos = imageNodes[currNodeIndex].pos;

  const prev = () => {
    if (!currentItem) {
      return;
    }
    const currentIndex = findIndex(
      imageNodes,
      (node) => node.pos === currentItem
    );
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      return;
    }
    const prevImgPos = imageNodes[prevIndex].pos;
    lightbox.currentItem = prevImgPos;
  };
  const next = () => {
    if (!currentItem) {
      return;
    }
    const currentIndex = findIndex(
      imageNodes,
      (node) => node.pos === currentItem
    );
    const nextIndex = currentIndex + 1;
    if (nextIndex > imageNodes.length) {
      return;
    }
    const nextImgPos = imageNodes[nextIndex].pos;
    lightbox.currentItem = nextImgPos;
  };
  return (
    <Dialog.Root open={!!currentItem}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Close onClick={() => lightbox.close()}>x</Dialog.Close>
          {currentItem ? (
            <>
              <button onClick={() => prev()}>{"<"}</button>
              <button onClick={() => next()}>{">"}</button>
              <div className="lightbox-content">
                <Image node={currImgNode} />
              </div>
            </>
          ) : null}
        </Dialog.Content>
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

export default observer(Lightbox);
