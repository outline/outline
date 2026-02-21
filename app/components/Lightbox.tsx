import { observer } from "mobx-react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Keyframes } from "styled-components";
import styled, { css, keyframes } from "styled-components";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isInternalUrl } from "@shared/utils/urls";
import { Error as ImageError } from "@shared/editor/components/Image";
import {
  BackIcon,
  CloseIcon,
  CrossIcon,
  DownloadIcon,
  LinkIcon,
  NextIcon,
  ZoomInIcon,
  ZoomOutIcon,
  EditIcon,
} from "outline-icons";
import { depths, extraArea, s } from "@shared/styles";
import NudeButton from "./NudeButton";
import useIdle from "~/hooks/useIdle";
import { Second } from "@shared/utils/time";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useTranslation } from "react-i18next";
import Tooltip from "~/components/Tooltip";
import LoadingIndicator from "./LoadingIndicator";
import Fade from "./Fade";
import Button from "./Button";
import CopyToClipboard from "./CopyToClipboard";
import { Separator } from "./Actions";
import useSwipe from "~/hooks/useSwipe";
import { toast } from "sonner";
import { findIndex } from "lodash";
import type { LightboxImage } from "@shared/editor/lib/Lightbox";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import {
  TransformWrapper,
  TransformComponent,
  useTransformEffect,
} from "react-zoom-pan-pinch";
import { transparentize } from "polished";
import { mergeRefs } from "react-merge-refs";
import { useEditor } from "~/editor/components/EditorContext";
import { NodeSelection } from "prosemirror-state";
import { ImageSource } from "@shared/editor/lib/FileHelper";
import Desktop from "~/utils/Desktop";
import { HStack } from "./primitives/HStack";

export enum LightboxStatus {
  READY_TO_OPEN,
  OPENING,
  OPENED,
  READY_TO_CLOSE,
  CLOSING,
  CLOSED,
}

export enum ImageStatus {
  LOADING,
  ERROR,
  LOADED,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOMED,
}
type Status = {
  lightbox: LightboxStatus | null;
  image: ImageStatus | null;
};

type Animation = {
  fadeIn?: { apply: () => Keyframes; duration: number };
  fadeOut?: { apply: () => Keyframes; duration: number };
  zoomIn?: { apply: () => Keyframes; duration: number };
  zoomOut?: { apply: () => Keyframes; duration: number };
  startTime?: number;
};

const ANIMATION_DURATION = 0.3 * Second.ms;

type Props = {
  /** List of allowed images */
  images: LightboxImage[];
  /** The currently active image in the document */
  activeImage: LightboxImage;
  /** Callback triggered when the active image is updated */
  onUpdate: (activeImage: LightboxImage | null) => void;
  /** Callback triggered when Lightbox closes */
  onClose: () => void;
  /** Whether the editor is read only */
  readOnly?: boolean;
};

const ZoomPanPinchContext = createContext({ isImagePanning: false });
type ZoomablePannablePinchableProps = {
  children: ReactNode;
  panningDisabled: boolean;
  disabled: boolean;
  onClose?: () => void;
};

const ZoomablePannablePinchable = forwardRef<
  ReactZoomPanPinchRef,
  ZoomablePannablePinchableProps
>(({ children, panningDisabled, disabled, onClose }, ref) => {
  const { isPanning, ...panningHandlers } = usePanning();
  const wrapperRef = useRef<ReactZoomPanPinchRef>(null);
  const scale = wrapperRef.current?.instance.transformState.scale ?? 1;

  const wrapperProps = useMemo(
    () =>
      ({
        onClick: (event) => {
          if (scale > 1) {
            return;
          }
          if (event.defaultPrevented) {
            return;
          }
          if (
            ["IMG", "INPUT", "BUTTON", "A"].includes(
              (event.target as Element).tagName
            )
          ) {
            return;
          }
          onClose?.();
        },
      }) satisfies HTMLAttributes<HTMLDivElement>,
    [onClose, scale]
  );

  return (
    <ZoomPanPinchContext.Provider value={{ isImagePanning: isPanning }}>
      <TransformWrapper
        ref={mergeRefs([ref, wrapperRef])}
        disabled={disabled}
        doubleClick={{ disabled: true }}
        minScale={1}
        maxScale={8}
        panning={{
          disabled: panningDisabled,
        }}
        {...panningHandlers}
      >
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: "100%",
            cursor: isPanning ? "grabbing" : scale > 1 ? "grab" : "zoom-out",
          }}
          contentStyle={{
            width: "100%",
            height: "100%",
            padding: "56px",
            justifyContent: "center",
            alignItems: "center",
          }}
          wrapperProps={wrapperProps}
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </ZoomPanPinchContext.Provider>
  );
});

function usePanning() {
  const [isPanning, setPanning] = useState(false);
  const dragged = useRef(false);

  const onPanningStart: ComponentProps<
    typeof TransformWrapper
  >["onPanningStart"] = (ref) => {
    const zoomedIn = ref.state.scale > 1;
    if (zoomedIn) {
      setPanning(ref.instance.isPanning);
    }
  };

  const onPanning: ComponentProps<
    typeof TransformWrapper
  >["onPanning"] = () => {
    dragged.current = true;
  };

  const onPanningStop: ComponentProps<
    typeof TransformWrapper
  >["onPanningStop"] = (ref, event) => {
    setPanning(ref.instance.isPanning);
    if (dragged.current) {
      dragged.current = false;
    } else if (event.target instanceof HTMLImageElement) {
      const zoomedOut = Math.abs(ref.state.scale - 1) < 0.001;
      if (zoomedOut) {
        ref.zoomIn();
      } else {
        ref.resetTransform();
      }
    }
  };

  return {
    isPanning,
    onPanningStart,
    onPanning,
    onPanningStop,
  };
}

function Lightbox({ images, activeImage, onUpdate, onClose, readOnly }: Props) {
  const isIdle = useIdle(3 * Second.ms);
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>({ lightbox: null, image: null });
  const animation = useRef<Animation | null>(null);
  const finalImage = useRef<{
    center: { x: number; y: number };
    width: number;
    height: number;
  } | null>(null);
  const zoomPanPinchRef = useRef<ReactZoomPanPinchRef>(null);
  const editor = useEditor();

  const currentImageIndex = findIndex(
    images,
    (img) => img.pos === activeImage.pos
  );

  // Debugging status changes
  // useEffect(() => {
  //   console.log(
  //     `lstat:${status.lightbox === null ? status.lightbox : LightboxStatus[status.lightbox]}, istat:${status.image === null ? status.image : ImageStatus[status.image]}`
  //   );
  // }, [status]);

  useEffect(
    () => () => {
      if (status.lightbox === LightboxStatus.CLOSED) {
        onClose();
      }
    },
    [status.lightbox]
  );

  useEffect(() => {
    setStatus({
      lightbox: LightboxStatus.READY_TO_OPEN,
      image: status.image,
    });
  }, []);

  useEffect(() => {
    if (status.image === ImageStatus.LOADED) {
      rememberImagePosition();
    }
  }, [status.image]);

  useEffect(() => {
    if (
      (status.image === ImageStatus.ERROR ||
        status.image === ImageStatus.LOADED) &&
      status.lightbox === LightboxStatus.READY_TO_OPEN
    ) {
      setupFadeIn();
      setupZoomIn();
      setStatus({
        lightbox: LightboxStatus.OPENING,
        image: status.image,
      });
    }
  }, [status.image, status.lightbox]);

  useEffect(() => {
    if (
      status.lightbox === LightboxStatus.OPENED &&
      status.image === ImageStatus.LOADED
    ) {
      setStatus({
        lightbox: LightboxStatus.OPENED,
        image: ImageStatus.MIN_ZOOM,
      });
    }
  }, [status.lightbox, status.image]);

  useEffect(() => {
    if (status.lightbox === LightboxStatus.READY_TO_CLOSE) {
      setupFadeOut();
      setupZoomOut();
      setStatus({
        lightbox: LightboxStatus.CLOSING,
        image: status.image,
      });
    }
  }, [status.lightbox]);

  useEffect(() => {
    if (status.lightbox === LightboxStatus.CLOSED) {
      onUpdate(null);
    }
  }, [status.lightbox]);

  useEffect(() => {
    if (status.image === ImageStatus.MIN_ZOOM) {
      // It was observed that focus went to `body` as the zoom out button was disabled
      // upon clicking it. This stopped navigating to next/previous image using arrow keys.
      // So focusing the content div here to restore the functionality.
      contentRef.current?.focus();
    }
  }, [status.image]);

  const rememberImagePosition = () => {
    if (imgRef.current) {
      const lightboxImgDOMRect = imgRef.current.getBoundingClientRect();
      const {
        top: lightboxImgTop,
        left: lightboxImgLeft,
        width: lightboxImgWidth,
        height: lightboxImgHeight,
      } = lightboxImgDOMRect;
      finalImage.current = {
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
      const editorImageEl = activeImage.getElement();
      if (!editorImageEl) {
        return;
      }
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
      const lightboxImgDOMRect = imgRef.current.getBoundingClientRect();
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
              from { opacity: ${overlayRef.current ? window.getComputedStyle(overlayRef.current).opacity : 1}; }
              to { opacity: 0; }
              `;
    animation.current = {
      ...(animation.current ?? {}),
      fadeIn: undefined,
      fadeOut: {
        apply: fadeOut,
        duration: animation.current?.startTime
          ? Date.now() - animation.current.startTime
          : ANIMATION_DURATION,
      },
    };
  };

  const setupZoomOut = () => {
    if (
      imgRef.current &&
      !(
        status.image === ImageStatus.ZOOMED ||
        status.image === ImageStatus.MAX_ZOOM
      )
    ) {
      // in lightbox
      const lightboxImgDOMRect = imgRef.current.getBoundingClientRect();
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
      const editorImageEl = activeImage.getElement();
      let to;
      if (editorImageEl?.isConnected) {
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
        const final = finalImage.current;
        if (!final) {
          return keyframes``;
        }

        const fromTx = from.center.x - final.center.x;
        const fromTy = from.center.y - final.center.y;
        const toTx = to.center.x - final.center.x;
        const toTy = to.center.y - final.center.y;

        const fromS = from.width / final.width;
        const toS = to.width / final.width;
        return keyframes`
            from {
              translate: ${fromTx}px ${fromTy}px;
              scale: ${fromS};
            }
            to {
              translate: ${toTx}px ${toTy}px;
              scale: ${toS};
            }
        `;
      };
      animation.current = {
        ...(animation.current ?? {}),
        zoomIn: undefined,
        zoomOut: {
          apply: zoomOut,
          duration: animation.current?.startTime
            ? Date.now() - animation.current.startTime
            : ANIMATION_DURATION,
        },
      };
    }
  };

  const prev = () => {
    if (
      status.lightbox === LightboxStatus.OPENED &&
      (status.image === ImageStatus.MIN_ZOOM ||
        status.image === ImageStatus.ERROR)
    ) {
      const prevIndex = currentImageIndex - 1;
      if (prevIndex < 0) {
        return;
      }
      onUpdate(images[prevIndex]);
    }
  };

  const next = () => {
    if (
      status.lightbox === LightboxStatus.OPENED &&
      (status.image === ImageStatus.MIN_ZOOM ||
        status.image === ImageStatus.ERROR)
    ) {
      const nextIndex = currentImageIndex + 1;
      if (nextIndex >= images.length) {
        return;
      }
      onUpdate(images[nextIndex]);
    }
  };

  const close = () => {
    if (
      status.lightbox === LightboxStatus.OPENING ||
      status.lightbox === LightboxStatus.OPENED
    ) {
      setStatus({
        lightbox: LightboxStatus.READY_TO_CLOSE,
        image: status.image,
      });
    }
  };

  const svgDataURLToBlob = (dataURL: string) => {
    // Match the SVG data URL format (with or without charset)
    const match = dataURL.match(
      /^data:image\/svg\+xml(?:;charset=utf-8)?,(.*)$/i
    );
    if (!match) {
      return;
    }

    const encodedSVGData = match[1];
    const decodedSVGData = decodeURIComponent(encodedSVGData);

    // Convert string to Uint8Array
    const uint8 = new Uint8Array(decodedSVGData.length);
    for (let i = 0; i < decodedSVGData.length; ++i) {
      uint8[i] = decodedSVGData.charCodeAt(i);
    }

    // Create and return the Blob
    return new Blob([uint8], { type: "image/svg+xml" });
  };

  const downloadImage = async (src: string, saveAs: string) => {
    let imageBlob;
    if (isInternalUrl(src)) {
      const image = await fetch(src);
      imageBlob = await image.blob();
    } else {
      // Assuming it's a mermaid svg
      imageBlob = svgDataURLToBlob(src);
    }

    if (!imageBlob) {
      toast.error(t("Unable to download image"));
      return;
    }

    const imageURL = URL.createObjectURL(imageBlob);
    const name = saveAs || "image";
    const extension = imageBlob.type.split(/\/|\+/g)[1];

    // create a temporary link node and click it with our image data
    const link = document.createElement("a");
    link.href = imageURL;
    link.download = `${name}.${extension}`;
    document.body.appendChild(link);
    link.click();

    // cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(imageURL);
  };

  const handleDownload = useCallback(() => {
    if (activeImage && status.lightbox === LightboxStatus.OPENED) {
      void downloadImage(activeImage.src, activeImage.alt);
    }
  }, [activeImage, status.lightbox]);

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
        zoomIn: undefined,
        fadeIn: undefined,
        startTime: undefined,
      };
      setStatus({
        lightbox: LightboxStatus.OPENED,
        image: status.image,
      });
    } else if (animation.current?.fadeOut) {
      setStatus({
        lightbox: LightboxStatus.CLOSED,
        image: null,
      });
    }
  };

  const handleEditDiagram = () => {
    const { state, dispatch } = editor.view;

    // Select the node at the position
    const tr = state.tr.setSelection(
      NodeSelection.create(state.doc, activeImage.pos)
    );
    dispatch(tr);
    editor.commands.editDiagram();
  };

  return (
    <Dialog.Root open={true}>
      <Dialog.Portal>
        <StyledOverlay
          ref={overlayRef}
          animation={animation.current}
          onAnimationStart={handleFadeStart}
          onAnimationEnd={handleFadeEnd}
        />
        <StyledContent onKeyDown={handleKeyDown} ref={contentRef}>
          <VisuallyHidden.Root>
            <Dialog.Title>{t("Lightbox")}</Dialog.Title>
            <Dialog.Description>
              {t("View, navigate, or download images in the document")}
            </Dialog.Description>
          </VisuallyHidden.Root>
          <Actions animation={animation.current}>
            <Tooltip content={t("Zoom in")} placement="bottom">
              <ActionButton
                tabIndex={-1}
                disabled={
                  status.image === ImageStatus.MAX_ZOOM ||
                  status.image === ImageStatus.ERROR
                }
                onClick={() => {
                  if (zoomPanPinchRef.current) {
                    zoomPanPinchRef.current.zoomIn();
                  }
                }}
                aria-label={t("Zoom in")}
                size={32}
                icon={<ZoomInIcon />}
                borderOnHover
                neutral
              />
            </Tooltip>
            <Tooltip content={t("Zoom out")} placement="bottom">
              <ActionButton
                tabIndex={-1}
                disabled={
                  !(
                    status.image === ImageStatus.ZOOMED ||
                    status.image === ImageStatus.MAX_ZOOM
                  )
                }
                onClick={() => {
                  if (zoomPanPinchRef.current) {
                    zoomPanPinchRef.current.zoomOut();
                  }
                }}
                aria-label={t("Zoom out")}
                size={32}
                icon={<ZoomOutIcon />}
                borderOnHover
                neutral
              />
            </Tooltip>
            <Separator />
            <Tooltip content={t("Copy link")} placement="bottom">
              <CopyToClipboard text={imgRef.current?.src ?? ""}>
                <ActionButton
                  tabIndex={-1}
                  disabled={status.image === ImageStatus.ERROR}
                  aria-label={t("Copy link")}
                  size={32}
                  icon={<LinkIcon />}
                  borderOnHover
                  neutral
                />
              </CopyToClipboard>
            </Tooltip>
            <Tooltip content={t("Download")} placement="bottom">
              <ActionButton
                tabIndex={-1}
                disabled={status.image === ImageStatus.ERROR}
                onClick={handleDownload}
                aria-label={t("Download")}
                size={32}
                icon={<DownloadIcon />}
                borderOnHover
                neutral
              />
            </Tooltip>
            {activeImage.source === ImageSource.DiagramsNet &&
              !Desktop.isElectron() &&
              !readOnly && (
                <Tooltip content={t("Edit diagram")} placement="bottom">
                  <ActionButton
                    tabIndex={-1}
                    disabled={status.image === ImageStatus.ERROR}
                    onClick={handleEditDiagram}
                    aria-label={t("Edit diagram")}
                    size={32}
                    icon={<EditIcon />}
                    borderOnHover
                    neutral
                  />
                </Tooltip>
              )}
            <Separator />
            <Dialog.Close asChild>
              <Tooltip content={t("Close")} shortcut="Esc" placement="bottom">
                <ActionButton
                  tabIndex={-1}
                  onClick={close}
                  aria-label={t("Close")}
                  size={32}
                  icon={<CloseIcon />}
                  borderOnHover
                  neutral
                />
              </Tooltip>
            </Dialog.Close>
          </Actions>
          {currentImageIndex > 0 &&
            !(
              status.image === ImageStatus.ZOOMED ||
              status.image === ImageStatus.MAX_ZOOM
            ) && (
              <Nav dir="left" $hidden={isIdle} animation={animation.current}>
                <NavButton onClick={prev} size={32} aria-label={t("Previous")}>
                  <BackIcon size={32} />
                </NavButton>
              </Nav>
            )}
          <ZoomablePannablePinchable
            panningDisabled={
              !(
                status.image === ImageStatus.ZOOMED ||
                status.image === ImageStatus.MAX_ZOOM
              )
            }
            disabled={status.image === ImageStatus.ERROR}
            ref={zoomPanPinchRef}
            onClose={close}
          >
            <Image
              ref={imgRef}
              src={activeImage.src}
              alt={activeImage.alt}
              onLoading={() =>
                setStatus({
                  lightbox: status.lightbox,
                  image: ImageStatus.LOADING,
                })
              }
              onLoad={() =>
                setStatus({
                  lightbox: status.lightbox,
                  image: ImageStatus.LOADED,
                })
              }
              onError={() =>
                setStatus({
                  lightbox: status.lightbox,
                  image: ImageStatus.ERROR,
                })
              }
              onSwipeRight={prev}
              onSwipeLeft={next}
              onSwipeUp={close}
              onSwipeDown={close}
              status={status}
              animation={animation.current}
              onMinZoom={() => {
                setStatus({
                  lightbox: status.lightbox,
                  image: ImageStatus.MIN_ZOOM,
                });
              }}
              onZoom={() =>
                setStatus({
                  lightbox: status.lightbox,
                  image: ImageStatus.ZOOMED,
                })
              }
              onMaxZoom={() =>
                setStatus({
                  lightbox: status.lightbox,
                  image: ImageStatus.MAX_ZOOM,
                })
              }
            />
          </ZoomablePannablePinchable>
          {currentImageIndex < images.length - 1 &&
            !(
              status.image === ImageStatus.ZOOMED ||
              status.image === ImageStatus.MAX_ZOOM
            ) && (
              <Nav dir="right" $hidden={isIdle} animation={animation.current}>
                <NavButton onClick={next} size={32} aria-label={t("Next")}>
                  <NextIcon size={32} />
                </NavButton>
              </Nav>
            )}
        </StyledContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ImageProps = {
  src: string;
  alt: string;
  onLoading: () => void;
  onLoad: () => void;
  onError: () => void;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  status: Status;
  animation: Animation | null;
  onMinZoom: () => void;
  onZoom: () => void;
  onMaxZoom: () => void;
};

const Image = forwardRef<HTMLImageElement, ImageProps>(function Image_(
  {
    src,
    alt,
    onLoading,
    onLoad,
    onError,
    onSwipeRight,
    onSwipeLeft,
    onSwipeUp,
    onSwipeDown,
    status,
    animation,
    onMinZoom,
    onZoom,
    onMaxZoom,
  }: ImageProps,
  ref
) {
  const { t } = useTranslation();

  const swipeHandlers = useSwipe({
    onSwipeRight,
    onSwipeLeft,
    onSwipeUp,
    onSwipeDown,
  });

  const { isImagePanning } = useContext(ZoomPanPinchContext);

  useTransformEffect(({ state, instance }) => {
    const minScale = instance.props.minScale ?? 1;
    const maxScale = instance.props.maxScale ?? 8;
    const { scale } = state;
    if (scale === minScale && status.image === ImageStatus.ZOOMED) {
      onMinZoom();
    } else if (scale === maxScale && status.image === ImageStatus.ZOOMED) {
      onMaxZoom();
    } else if (
      scale > minScale &&
      scale < maxScale &&
      status.image !== ImageStatus.ZOOMED
    ) {
      onZoom();
    }
  });

  const [hidden, setHidden] = useState(
    status.image === null || status.image === ImageStatus.LOADING
  );

  useEffect(() => {
    onLoading();
  }, [src]);

  useEffect(() => {
    if (status.image === null || status.image === ImageStatus.LOADING) {
      setHidden(true);
    } else if (status.image === ImageStatus.LOADED) {
      setHidden(false);
    }
  }, [status.image]);

  return status.image === ImageStatus.ERROR ? (
    <StyledError animation={animation} {...swipeHandlers}>
      <CrossIcon size={16} /> {t("Image failed to load")}
    </StyledError>
  ) : (
    <>
      {status.image === ImageStatus.LOADING && <LoadingIndicator />}
      <Figure>
        <StyledImg
          ref={ref}
          src={src}
          alt={alt}
          animation={animation}
          onAnimationStart={() => setHidden(false)}
          {...swipeHandlers}
          onError={onError}
          onLoad={onLoad}
          $hidden={hidden}
          $zoomedIn={
            status.image === ImageStatus.ZOOMED ||
            status.image === ImageStatus.MAX_ZOOM
          }
          $zoomedOut={status.image === ImageStatus.MIN_ZOOM}
          $panning={isImagePanning}
        />
        <Caption>
          {status.image === ImageStatus.MIN_ZOOM &&
          status.lightbox === LightboxStatus.OPENED ? (
            <Fade>{alt}</Fade>
          ) : null}
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
  margin-top: 8px;
  color: ${s("textSecondary")};
  flex-shrink: 0;
`;

const StyledOverlay = styled(Dialog.Overlay)<{
  animation: Animation | null;
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
  $zoomedIn: boolean;
  $zoomedOut: boolean;
  $panning: boolean;
  animation: Animation | null;
}>`
  visibility: ${(props) => (props.$hidden ? "hidden" : "visible")};
  pointer-events: auto !important;
  max-width: 100%;
  min-height: 0;
  object-fit: contain;
  cursor: ${(props) =>
    props.$panning
      ? "grabbing"
      : props.$zoomedOut
        ? "zoom-in"
        : props.$zoomedIn
          ? "zoom-out"
          : "default"};

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
        : props.animation?.fadeOut
          ? css`
              animation: ${props.animation.fadeOut.apply()}
                ${props.animation.fadeOut.duration}ms;
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
`;

const ActionButton = styled(Button)`
  background: transparent;
`;

const Actions = styled(HStack)<{
  animation: Animation | null;
}>`
  position: absolute;
  top: 0;
  right: 0;
  margin: 16px 12px;
  z-index: ${depths.modal};
  background: ${(props) => transparentize(0.2, props.theme.background)};
  backdrop-filter: blur(4px);
  border-radius: 6px;

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

const Nav = styled.div<{
  $hidden: boolean;
  dir: "left" | "right";
  animation: Animation | null;
}>`
  position: absolute;
  ${(props) => (props.dir === "left" ? "left: 0;" : "right: 0;")}
  transition: opacity 500ms ease-in-out;
  z-index: ${depths.modal};
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

const StyledError = styled(ImageError)<{
  animation: Animation | null;
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

const NavButton = styled(NudeButton)`
  margin: 16px;
  opacity: 0.75;
  color: ${s("text")};
  outline: none;
  ${extraArea(12)}

  &:hover {
    opacity: 1;
  }
`;

export default observer(Lightbox);
