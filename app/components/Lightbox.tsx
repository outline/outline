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
import { cloneElement, useCallback, useEffect, useRef, useState } from "react";
import { sanitizeUrl } from "@shared/utils/urls";
import { Node } from "prosemirror-model";

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
          <Dialog.Close asChild>
            <button className="close-button">
              <span
                className="visually-hidden"
                onClick={() => lightbox.close()}
              >
                Close
              </span>
            </button>
          </Dialog.Close>
          {currentItem ? (
            <>
              <button onClick={() => prev()}>{"<"}</button>
              <button onClick={() => next()}>{">"}</button>
              <div className="lightbox-content">
                <Image node={currImgNode} getPos={() => currImgPos} />
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type Props = {
  /** Callback triggered when the image is resized */
  onChangeSize?: (props: { width: number; height?: number }) => void;
  node: Node;
  getPos: () => number;
};

const Image = (props: Props) => {
  const { node, onChangeSize, getPos } = props;
  const { src, layoutClass } = node.attrs;
  const className = layoutClass ? `image image-${layoutClass}` : "image";
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [naturalWidth, setNaturalWidth] = useState(node.attrs.width);
  const [naturalHeight, setNaturalHeight] = useState(node.attrs.height);
  const ref = useRef<HTMLDivElement>(null);
  const { width, height, setSize } = useDragResize({
    width: node.attrs.width ?? naturalWidth,
    height: node.attrs.height ?? naturalHeight,
    naturalWidth,
    naturalHeight,
    gridSnap: 5,
    onChangeSize,
    ref,
  });

  const { lightbox } = useStores();

  const isFullWidth = layoutClass === "full-width";
  const isResizable = !!props.onChangeSize && !error;

  useEffect(() => {
    if (node.attrs.width && node.attrs.width !== width) {
      setSize({
        width: node.attrs.width,
        height: node.attrs.height,
      });
    }
  }, [node.attrs.width]);

  const sanitizedSrc = sanitizeUrl(src);

  const widthStyle = isFullWidth
    ? { width: "var(--container-width)" }
    : { width: width || "auto" };

  return (
    <div contentEditable={false} className={className} ref={ref}>
      <ImageWrapper isFullWidth={isFullWidth} style={widthStyle}>
        <img
          className={EditorStyleHelper.imageHandle}
          style={{
            ...widthStyle,
            display: loaded ? "block" : "none",
          }}
          src={sanitizedSrc}
          data-index={getPos()}
          alt={node.attrs.alt || ""}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
          onLoad={(ev: React.SyntheticEvent<HTMLImageElement>) => {
            // For some SVG's Firefox does not provide the naturalWidth, in this
            // rare case we need to provide a default so that the image can be
            // seen and is not sized to 0px
            const nw = (ev.target as HTMLImageElement).naturalWidth || 300;
            const nh = (ev.target as HTMLImageElement).naturalHeight;
            setNaturalWidth(nw);
            setNaturalHeight(nh);
            setLoaded(true);

            if (!node.attrs.width) {
              setSize((state) => ({
                ...state,
                width: nw,
              }));
            }
          }}
        />
      </ImageWrapper>
    </div>
  );
};

const ImageWrapper = styled.div<{ isFullWidth: boolean }>`
  line-height: 0;
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: ${(props) => (props.isFullWidth ? "initial" : "100%")};
  transition-property: width, height;
  transition-duration: ${(props) => (props.isFullWidth ? "0ms" : "150ms")};
  transition-timing-function: ease-in-out;
  overflow: hidden;

  img {
    transition-property: width, height;
    transition-duration: ${(props) => (props.isFullWidth ? "0ms" : "150ms")};
    transition-timing-function: ease-in-out;
  }
`;

export default observer(Lightbox);
