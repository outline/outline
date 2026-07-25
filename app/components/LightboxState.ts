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

export type Status = {
  lightbox: LightboxStatus | null;
  image: ImageStatus | null;
};

export type Action =
  /** The lightbox mounted and is ready to begin its opening animation. */
  | { type: "mounted" }
  /** A new image started loading, either the first one or after navigating. */
  | { type: "imageLoading" }
  | { type: "imageLoaded" }
  | { type: "imageErrored" }
  /** The zoom level changed, either by the user or by resetting the transform. */
  | { type: "zoomChanged"; zoom: ImageStatus }
  /** The opening fade and zoom keyframes have been measured and applied. */
  | { type: "openAnimationPrepared" }
  | { type: "openAnimationEnded" }
  /** The user asked to close, e.g. via Escape, the close button, or a swipe. */
  | { type: "closeRequested" }
  /** The closing fade and zoom keyframes have been measured and applied. */
  | { type: "closeAnimationPrepared" }
  | { type: "closeAnimationEnded" };

export const initialStatus: Status = { lightbox: null, image: null };

/**
 * Settles the image at minimum zoom once the lightbox has finished opening and
 * the image has loaded, whichever of the two happens last.
 *
 * @param status The status to settle.
 * @returns The settled status.
 */
function settle(status: Status): Status {
  return status.lightbox === LightboxStatus.OPENED &&
    status.image === ImageStatus.LOADED
    ? { ...status, image: ImageStatus.MIN_ZOOM }
    : status;
}

/**
 * Drives the lightbox open and close choreography. Transitions are guarded so
 * that events arriving out of order — a slow image load completing after the
 * user has already started closing, for example — cannot move it backwards.
 *
 * @param status The current status.
 * @param action The action to apply.
 * @returns The next status.
 */
export function reducer(status: Status, action: Action): Status {
  switch (action.type) {
    case "mounted":
      return { ...status, lightbox: LightboxStatus.READY_TO_OPEN };
    case "imageLoading":
      return settle({ ...status, image: ImageStatus.LOADING });
    case "imageLoaded":
      return settle({ ...status, image: ImageStatus.LOADED });
    case "imageErrored":
      return settle({ ...status, image: ImageStatus.ERROR });
    case "zoomChanged":
      return { ...status, image: action.zoom };
    case "openAnimationPrepared":
      return status.lightbox === LightboxStatus.READY_TO_OPEN
        ? { ...status, lightbox: LightboxStatus.OPENING }
        : status;
    case "openAnimationEnded":
      return settle({ ...status, lightbox: LightboxStatus.OPENED });
    case "closeRequested":
      return status.lightbox === LightboxStatus.OPENING ||
        status.lightbox === LightboxStatus.OPENED
        ? { ...status, lightbox: LightboxStatus.READY_TO_CLOSE }
        : status;
    case "closeAnimationPrepared":
      return status.lightbox === LightboxStatus.READY_TO_CLOSE
        ? { ...status, lightbox: LightboxStatus.CLOSING }
        : status;
    case "closeAnimationEnded":
      return { lightbox: LightboxStatus.CLOSED, image: null };
  }
}
