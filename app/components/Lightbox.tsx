import { observer } from "mobx-react";
import * as Dialog from "@radix-ui/react-dialog";
import styled, { css, Keyframes, keyframes } from "styled-components";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { isInternalUrl } from "@shared/utils/urls";
import { Error as ImageError } from "@shared/editor/components/Image";
import {
  BackIcon,
  CloseIcon,
  CrossIcon,
  DownloadIcon,
  LinkIcon,
  NextIcon,
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
import { LightboxImage } from "@shared/editor/lib/Lightbox";

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
  /** The position of the currently active image in the document */
  activeImage: LightboxImage;
  /** Callback triggered when the active image is updated */
  onUpdate: (activeImage: LightboxImage | null) => void;
  /** Callback triggered when Lightbox closes */
  onClose: () => void;
};

function Lightbox({ images, activeImage, onUpdate, onClose }: Props) {
  const isIdle = useIdle(3 * Second.ms);
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>({ lightbox: null, image: null });
  const animation = useRef<Animation | null>(null);
  const finalImage = useRef<{
    center: { x: number; y: number };
    width: number;
    height: number;
  } | null>(null);

  const currentImageIndex = findIndex(
    images,
    (img) => img.getPos() === activeImage.getPos()
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
    if (imgRef.current) {
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
          duration: animation.current?.startTime
            ? Date.now() - animation.current.startTime
            : ANIMATION_DURATION,
        },
      };
    }
  };

  const prev = () => {
    if (status.lightbox === LightboxStatus.OPENED) {
      const prevIndex = currentImageIndex - 1;
      if (prevIndex < 0) {
        return;
      }
      onUpdate(images[prevIndex]);
    }
  };

  const next = () => {
    if (status.lightbox === LightboxStatus.OPENED) {
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
    // Match the SVG data URL format
    const match = dataURL.match(/^data:image\/svg\+xml,(.*)$/i);
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

  const download = useCallback(() => {
    if (activeImage && status.lightbox === LightboxStatus.OPENED) {
      void downloadImage(activeImage.getSrc(), activeImage.getAlt());
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

  return (
    <Dialog.Root open={true}>
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
              {t("View, navigate, or download images in the document")}
            </Dialog.Description>
          </VisuallyHidden.Root>
          <Actions animation={animation.current}>
            <Tooltip content={t("Copy link")} placement="bottom">
              <CopyToClipboard text={imgRef.current?.src ?? ""}>
                <Button
                  tabIndex={-1}
                  aria-label={t("Copy link")}
                  size={32}
                  icon={<LinkIcon />}
                  borderOnHover
                  neutral
                />
              </CopyToClipboard>
            </Tooltip>
            <Tooltip content={t("Download")} placement="bottom">
              <Button
                tabIndex={-1}
                onClick={download}
                aria-label={t("Download")}
                size={32}
                icon={<DownloadIcon />}
                borderOnHover
                neutral
              />
            </Tooltip>
            <Separator />
            <Dialog.Close asChild>
              <Tooltip content={t("Close")} shortcut="Esc" placement="bottom">
                <Button
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
          {currentImageIndex > 0 && (
            <Nav dir="left" $hidden={isIdle} animation={animation.current}>
              <NavButton onClick={prev} size={32} aria-label={t("Previous")}>
                <BackIcon size={32} />
              </NavButton>
            </Nav>
          )}
          <Image
            ref={imgRef}
            src={activeImage.getSrc()}
            alt={activeImage.getAlt()}
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
          />
          {currentImageIndex < images.length - 1 && (
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
};

const Image = forwardRef<HTMLImageElement, ImageProps>(function _Image(
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
        />
        <Caption>
          {status.image === ImageStatus.LOADED &&
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
  animation: Animation | null;
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
  animation: Animation | null;
}>`
  position: absolute;
  top: 0;
  right: 0;
  margin: 16px 12px;
  display: flex;
  align-items: center;
  gap: 8px;

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
